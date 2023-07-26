// @ts-nocheck
/**
 *  顶点缓冲区
 *  顶点专用缓冲区
 *
 *  将demo 09改造所有数据都从顶点缓冲区获取
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
        struct Vertex {
           @location(0) position: vec2f,
           @location(1) color: vec4f,
           @location(2) offset: vec2f,
           @location(3) scale: vec2f,
           @location(4) perVertexColor: vec3f,
        }

        struct VSOutput {
          @builtin(position) position: vec4f,
          @location(0) color: vec4f,
        }

        @vertex 
        fn vs(pos: Vertex) -> VSOutput {
            var vsOut: VSOutput;
            vsOut.position = vec4f(
                pos.position * pos.scale + pos.offset, 0.0, 1.0
            );
            vsOut.color = pos.color * vec4f(pos.perVertexColor, 1.0);
            return vsOut;
        }

        @fragment
        fn fs(vsOut: VSOutput) -> @location(0) vec4f {
          return vsOut.color;
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
      buffers: [
        // 缓冲区条目（3个）
        {
          arrayStride: 5 * 4, // 2个浮点数， 每个浮点数4字节
          attributes: [
            {
              shaderLocation: 0, // 对应location(0)
              offset: 0, // 表示属性从顶点缓冲区总的0字节开始
              format: "float32x2", // 希望 WebGPU 将数据作为两个 32 位浮点数从缓冲区中拉出。
            }, // 位置
            {
              shaderLocation: 4,
              offset: 8,
              format: "float32x3",
            }, // 每个顶点的颜色
          ],
        },
        {
          arrayStride: 6 * 4,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 1, offset: 0, format: "float32x4" }, // 颜色
            { shaderLocation: 2, offset: 16, format: "float32x2" }, // offset
          ],
        },
        {
          arrayStride: 2 * 4,
          stepMode: "instance",
          attributes: [
            { shaderLocation: 3, offset: 0, format: "float32x2" }, // scale
          ],
        },
      ],
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

  // 7. 创建2个vertex buffer
  const kNumObjects = 100;
  const objectInfos = [];

  const staticUnitSize =
    4 * 4 + // 颜色是 4 个 32 位浮点（每个 4 字节）
    2 * 4; //  偏移量是 2 个 32 位浮点（每个 4 字节）

  const changingUnitSize = 2 * 4; // 缩放为 2 个 32 位浮点（每个 4 字节）

  const vertexUnitSize =
    2 * 4 + // 顶点位置
    3 * 4; // 每个顶点的颜色

  // 7.1 创建第一个vertex buffer (color, offset)
  const staticVertexBuffer = device.createBuffer({
    label: "static vertex for objects",
    size: staticUnitSize * kNumObjects,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // 7.2 创建第二个vertex buffer (scale)
  const changingVertexBuffer = device.createBuffer({
    label: "changing storage for objects",
    size: changingUnitSize * kNumObjects,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // 7.3 创建第三个VERTEX buffer (position)
  const vertexBuffer = device.createBuffer({
    label: "vertex VERTEX for objects",
    size: vertexUnitSize * kNumObjects,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
  });

  // 8 设置第一个buffer
  const kColorOffset = 0;
  const kOffsetOffset = 4;

  const kScaleOffset = 0;

  const kVertexOffset = 0;
  const kVertexColorOffset = 2;

  {
    const staticVertexValues = new Float32Array(
      (staticUnitSize * kNumObjects) / 4
    );
    const vertexValues = new Float32Array((vertexUnitSize * kNumObjects) / 4);
    for (let i = 0; i < kNumObjects; i++) {
      const staticOffset = i * (staticUnitSize / 4);
      const vertexOffset = i * (vertexUnitSize / 4);
      staticVertexValues.set(
        [rand(), rand(), rand(), 1],
        staticOffset + kColorOffset
      );
      staticVertexValues.set(
        [rand(-0.9, 0.9), rand(-0.9, 0.9)],
        staticOffset + kOffsetOffset
      );
      vertexValues.set(
        [rand(-0.9, 0.9), rand(-0.9, 0.9)],
        vertexOffset + kVertexOffset
      );
      vertexValues.set(
        [rand(), rand(), rand()],
        vertexOffset + kVertexColorOffset
      );

      // 因为涉及到屏幕aspect， 所以暂时存储起来， 在render的时候更新buffer
      objectInfos.push({
        scale: rand(0.2, 0.5),
        idx: i,
      });
    }
    // 8.1 将staticStorageBuffer写入内存
    device.queue.writeBuffer(staticVertexBuffer, 0, staticVertexValues);
    device.queue.writeBuffer(vertexBuffer, 0, vertexValues);
  }

  // 8.2 创建一个changing storage values
  const changingVertexValues = new Float32Array(
    (changingUnitSize * kNumObjects) / 4
  );

  const frame = () => {
    // if (!pageState.active) return;

    const commandEncoder = device.createCommandEncoder(); // 1. 创建命令编码器来开始编码命令
    const textureView = context
      .getCurrentTexture() // 获取出现在画布中的纹理
      .createView(); //

    // 9.准备一个GPURenderPassDescriptor， 描述想要绘制的纹理，及如何使用他们的文件
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

    // 9.1 设置比例
    const aspect = canvas.width / canvas.height;
    for (const { scale, idx } of objectInfos) {
      changingVertexValues.set(
        [scale / aspect, scale],
        (idx * changingUnitSize) / 4 + kScaleOffset
      );
    }
    device.queue.writeBuffer(changingVertexBuffer, 0, changingVertexValues);

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor); //
    passEncoder.setPipeline(pipeline);
    passEncoder.setVertexBuffer(0, vertexBuffer);
    passEncoder.setVertexBuffer(1, staticVertexBuffer);
    passEncoder.setVertexBuffer(2, changingVertexBuffer);

    // 9.2 统一将比例值从js复制到GPU
    passEncoder.draw(3, kNumObjects, 0, 0); // 调用我们的顶点着色器 3 次, 实例的数量 1
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
      顶点缓冲区, 传递vertex, offset, color, scale
      <canvas ref={ref} width="500" height="500"></canvas>;
    </div>
  );
};
