//@ts-nocheck
// 存储缓冲区
/**
 *  uniforms buffer: 统一缓冲区   64k
 *  storage buffer: 存储缓冲区  128meg = 16MB    1Meg = 1/8MB = 1Mbit
 */
import { useLayoutEffect, useRef } from "react";
import styles from "./01-HelloTriangle.module.scss";

// [min 和 max) 之间的随机数
// 如果有 1 个参数，它将是 [0 到 min)
// 如果没有参数，它将是 [0 到 1)
const rand = (min, max) => {
  if (min === undefined) {
    min = 0;
    max = 1;
  } else if (max === undefined) {
    min = 0;
    max = min;
  }

  return min + Math.random() * (max - min);
};

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
            offset: vec2f,
        };

        struct OtherStruct {
            scale: vec2f,
        }

        @group(0) @binding(0) var<storage, read> ourStruct: OurStruct;
        @group(0) @binding(1) var<storage, read> otherStruct: OtherStruct;
        
        @vertex 
        fn vs(
            @builtin(vertex_index) vertexIndex : u32
        ) -> @builtin(position) vec4f {
            let pos = array(
                vec2f(0.0, 0.5),
                vec2f(-0.5, -0.5),
                vec2f(0.5, -0.5)
            );
           return vec4f(
            pos[vertexIndex] * otherStruct.scale + ourStruct.offset, 0.0, 1.0
           );
        }

        @fragment
        fn fs() -> @location(0) vec4f {
          return ourStruct.color;
        }
    `,
  });

  //  包含一个或多个着色器函数
  //  6. 创建渲染管道
  const pipeline = device.createRenderPipeline({
    layout: "auto",
    vertex: {
      module,
      entryPoint: "vs", // 着色器函数名
    },
    fragment: {
      module,
      entryPoint: "fs", // 着色器函数名
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

  // 7. 创建一堆 uniform buffer
  const kNumObjects = 100;
  const objectInfos = [];

  const staticUniformBufferSize =
    4 * 4 + // 颜色是 4 个 32 位浮点（每个 4 字节）
    2 * 4 + //  偏移量是 2 个 32 位浮点（每个 4 字节）
    2 * 4; // padding

  const uniformBufferSize = 2 * 4; // 缩放为 2 个 32 位浮点（每个 4 字节）

  for (let i = 0; i < kNumObjects; i++) {
    const staticUniformBuffer = device.createBuffer({
      label: `uniforms for obj: ${i}`,
      size: staticUniformBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });

    // 只设置一次， 直接设置
    {
      const uniformValues = new Float32Array(staticUniformBufferSize / 4);
      uniformValues.set([rand(), rand(), rand(), 1], 0); // 设置颜色为 随机
      uniformValues.set([rand(-0.9, 0.9), rand(-0.9, 0.9)], 4); // 设置偏移量

      device.queue.writeBuffer(staticUniformBuffer, 0, uniformValues);
    }

    // 需要多次设置的
    // 创建一个类型数组保存js中的值
    const uniformBuffer = device.createBuffer({
      label: `changeing uniforms for obj:${i}`,
      size: uniformBufferSize,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const uniformValues = new Float32Array(uniformBufferSize / 4);
    // 7.1 创建绑定组， 将缓冲区绑定到@binding(?)
    const bindGroup = device.createBindGroup({
      label: `bind group for obj: ${i}`,
      layout: pipeline.getBindGroupLayout(0),
      entries: [
        { binding: 0, resource: { buffer: staticUniformBuffer } },
        { binding: 1, resource: { buffer: uniformBuffer } },
      ],
    });

    objectInfos.push({
      scale: rand(0.2, 0.5),
      uniformBuffer,
      uniformValues,
      bindGroup,
    });
  }

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
    // 7.2 设置比例
    const aspect = canvas.width / canvas.height;

    for (const {
      scale,
      bindGroup,
      uniformBuffer,
      uniformValues,
    } of objectInfos) {
      uniformValues.set([scale / aspect, scale], 0);
      // 7.3 将值从js复制到GPU
      device.queue.writeBuffer(uniformBuffer, 0, uniformValues);
      // 7.4设置绑定组
      passEncoder.setBindGroup(0, bindGroup);
      passEncoder.draw(3, 1, 0, 0); // 调用我们的顶点着色器 3 次
    }

    passEncoder.end();

    device.queue.submit([commandEncoder.finish()]);
  };

  // 通过observer监控画布大小并调整
  const observer = new ResizeObserver((entries) => {
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
      存储缓冲区
      <canvas ref={ref} width="500" height="500"></canvas>;
    </div>
  );
};
