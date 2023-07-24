//@ts-nocheck
// WebGPU 全局变量
import { useLayoutEffect, useRef } from "react";
import styles from "./01-HelloTriangle.module.scss";

async function init(ref: any) {
  const canvas = ref.current;
  // 1. 请求一个适配器
  const adapter = await navigator!.gpu!.requestAdapter();
  // 2. 从适配器请求一个设备
  const device = await adapter.requestDevice();

  // 3. 查找画布， 创建gpu上下文
  const context = canvas.getContext("webgpu") as GPUCanvasContext;

  const devicePixelRatio = window.devicePixelRatio || 1;
  canvas.width = canvas.clientWidth * devicePixelRatio;
  canvas.height = canvas.clientHeight * devicePixelRatio;
  const presentationFormat = navigator.gpu.getPreferredCanvasFormat();

  // 4. 关联画布，设置format
  context.configure({
    device,
    format: presentationFormat,
    alphaMode: "premultiplied",
  });

  // 5. 创建着色器模块
  const module = device.createShaderModule({
    label: "our hardcoded rgb triangle shaders",
    code: `
        struct OurStruct {
            color: vec4f,
            scale: vec2f,
            offset: vec2f,
        };

        @group(0) @binding(0) var<uniform> ourStruct: OurStruct;
        

        @vertex
        fn main(
            @builtin(vertex_index) vertexIndex : u32
        ) -> OurVertexShaderOutput {
            var pos = array<vec2<f32>, 3>(
                vec2(0.0, 0.5),
                vec2(-0.5, -0.5),
                vec2(0.5, -0.5)
            );
            var color = array<vec4f, 3>(
              vec4f(1, 0, 0, 1),
              vec4f(0,1,0,1),
              vec4f(0,0,1,1),
            );
            var vsOutput: OurVertexShaderOutput;
            vsOutput.position = vec4f(pos[vertexIndex], 0.0, 1.0);
            vsOutput.color = color[vertexIndex];
            // return vec4<f32>(pos[vertexIndex], 0.0, 1.0);
            return vsOutput;
        }

        @fragment
        fn fs(fsInput: OurVertexShaderOutput) -> @location(0) vec4<f32> {
          return fsInput.color;
        }

        @fragment
        fn fs2(@location(0) color: vec4f) -> @location(0) vec4f {
          return color;
        }

        // 使用坐标将三角形变成棋盘
        @fragment
        fn fs3(fsInput: OurVertexShaderOutput) -> @location(0) vec4<f32> {
          let red = vec4f(1, 0,0,1);
          let gray = vec4f(0, 1,1,1);

          let grid = vec2u(fsInput.position.xy) / 8;
          let checker = (grid.x + grid.y) % 2 == 1;

          return select(red, gray, checker);
        }
    `,
  });
  //  包含一个或多个着色器函数
  //  6. 创建渲染管道
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module,
      entryPoint: "main", // 着色器函数名
    },
    fragment: {
      module,
      entryPoint: "fs3", // 着色器函数名 使用坐标将三角形变成棋盘
      // entryPoint: "fs2", // 着色器函数名
      // entryPoint: "fs", // 着色器函数名
      targets: [
        {
          format: presentationFormat, // 7. 创建一个管道必须指定使用该管道最终渲染的纹理格式
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
    },
  });

  const frame = () => {
    // if (!pageState.active) return;

    const commandEncoder = device.createCommandEncoder(); // 1. 创建命令编码器来开始编码命令
    const textureView = context
      .getCurrentTexture() // 获取出现在画布中的纹理
      .createView(); //

    // 8.准备一个GPURenderPassDescriptor， 描述想要绘制的纹理，及如何使用他们的文件
    const renderPassDescriptor: GPURenderPassDescriptor = {
      // 8.1 colorAttachments 其中列出了我们将渲染的纹理以及如何处理这些纹理
      colorAttachments: [
        {
          view: textureView,
          clearValue: { r: 0.0, g: 0.0, b: 0.0, a: 1.0 },
          loadOp: "clear", // clear: 指定在绘制之前将纹理清除为清除值; load: 将纹理的现有内容加载到 GPU 中，以便我们可以绘制已有的内容
          storeOp: "store", // store: 表示存储我们绘制的结果; discard: 丢弃我们绘制的内容
        },
      ],
    };

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor); //
    passEncoder.setPipeline(pipeline);
    passEncoder.draw(3, 1, 0, 0); // 调用我们的顶点着色器 3 次
    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  };

  // 通过observer监控画布大小并调整
  const observer = new ResizeObserver((entries) => {
    console.log(entries);
    for (const entry of entries) {
      const canvas = entry.target;
      const width = entry.contentBoxSize[0].inlineSize;
      const height = entry.contentBoxSize[0].blockSize;
      canvas.width = Math.max(
        1,
        Math.min(width, device.limits.maxTextureDimension2D)
      );
      canvas.height = Math.max(
        1,
        Math.min(height, device.limits.maxTextureDimension2D)
      );
      // re-render
      frame();
    }
  });
  observer.observe(canvas);
}

export default () => {
  const ref = useRef();

  useLayoutEffect(() => {
    init(ref);
  }, []);

  return (
    <div className={styles.container}>
      <canvas ref={ref} width="500" height="500"></canvas>;
    </div>
  );
};
