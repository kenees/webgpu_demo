// @ts-nocheck
/**
 *  存储缓冲区
 *  使用顶点数据的存储缓冲区
 *
 *  绘制同一对象的大量实例的情况
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

        struct Vertex {
            position: vec2f,
        }

        @group(0) @binding(0) var<storage, read> ourStructs: array<OurStruct>;
        @group(0) @binding(1) var<storage, read> otherStructs: array<OtherStruct>;
        @group(0) @binding(2) var<storage, read> vertexs: array<Vertex>;
        

        struct VSOutput {
            @builtin(position) position: vec4f,
            @location(0) color: vec4f,
        }

        @vertex 
        fn vs(
            @builtin(vertex_index) vertexIndex: u32,
            @builtin(instance_index) instanceIndex: u32   // 正在处理的实例
        ) -> VSOutput {
            let ourStruct = ourStructs[instanceIndex];
            let otherStruct = otherStructs[instanceIndex];
            let pos = vertexs[instanceIndex + vertexIndex];

            var vsOut: VSOutput;
            vsOut.position = vec4f(
                pos.position * otherStruct.scale + ourStruct.offset, 0.0, 1.0
            );
            vsOut.color = ourStruct.color;
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

  // 7. 创建2个storage buffer
  const kNumObjects = 100;
  const objectInfos = [];

  const staticUnitSize =
    4 * 4 + // 颜色是 4 个 32 位浮点（每个 4 字节）
    2 * 4 + //  偏移量是 2 个 32 位浮点（每个 4 字节）
    2 * 4; // padding

  const changingUnitSize = 2 * 4; // 缩放为 2 个 32 位浮点（每个 4 字节）

  const vertexUnitSize = 2 * 3 * 4;

  // 7.1 创建第一个storage buffer
  const staticStorageBuffer = device.createBuffer({
    label: "static storage for objects",
    size: staticUnitSize * kNumObjects,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // 7.2 创建第二个storage buffer
  const changingStorageBuffer = device.createBuffer({
    label: "changing storage for objects",
    size: changingUnitSize * kNumObjects,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // 7.3 创建第三个storage buffer
  const vertexStorageBuffer = device.createBuffer({
    label: "vertex storage for objects",
    size: vertexUnitSize * kNumObjects,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // 8 设置第一个buffer
  const kColorOffset = 0;
  const kOffsetOffset = 4;
  const kScaleOffset = 0;
  const kVertexOffset = 0;

  {
    const staticStorageValues = new Float32Array(
      (staticUnitSize * kNumObjects) / 4
    );
    const vertexValues = new Float32Array((vertexUnitSize * kNumObjects) / 4);
    for (let i = 0; i < kNumObjects; i++) {
      const staticOffset = i * (staticUnitSize / 4);
      const vertexOffset = i * (vertexUnitSize / 4);
      staticStorageValues.set(
        [rand(), rand(), rand(), 1],
        staticOffset + kColorOffset
      );
      staticStorageValues.set(
        [rand(-0.9, 0.9), rand(-0.9, 0.9)],
        staticOffset + kOffsetOffset
      );
      //   const center = rand(-0.9, 0.9);
      //   vertexValues.set(
      //     [
      //       center,
      //       center + 0.5,
      //       center - 0.5,
      //       center - 0.5,
      //       center + 0.5,
      //       center - 0.5,
      //     ],
      //    vertexOffset + kVertexOffset
      //   );
      vertexValues.set(
        [
          rand(-0.9, 0.9),
          rand(-0.9, 0.9),
          rand(-0.9, 0.9),
          rand(-0.9, 0.9),
          rand(-0.9, 0.9),
          rand(-0.9, 0.9),
        ],
        vertexOffset + kVertexOffset
      );

      // 因为涉及到屏幕aspect， 所以暂时存储起来， 在render的时候更新buffer
      objectInfos.push({
        scale: rand(0.2, 0.5),
        idx: i,
      });
    }
    // 8.1 将staticStorageBuffer写入内存
    device.queue.writeBuffer(staticStorageBuffer, 0, staticStorageValues);
    device.queue.writeBuffer(vertexStorageBuffer, 0, vertexValues);
  }

  // 8.2 创建一个changing storage values
  const changingStorageValues = new Float32Array(
    (changingUnitSize * kNumObjects) / 4
  );

  // 8.3 创建bind group
  const bindGroup = device.createBindGroup({
    label: `bind group for obj`,
    layout: pipeline.getBindGroupLayout(0),
    entries: [
      { binding: 0, resource: { buffer: staticStorageBuffer } },
      { binding: 1, resource: { buffer: changingStorageBuffer } },
      { binding: 2, resource: { buffer: vertexStorageBuffer } },
    ],
  });

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

    const passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor); //
    passEncoder.setPipeline(pipeline);
    // 9.1 设置比例
    const aspect = canvas.width / canvas.height;
    for (const { scale, idx } of objectInfos) {
      changingStorageValues.set(
        [scale / aspect, scale],
        (idx * changingUnitSize) / 4 + kScaleOffset
      );
    }
    // 9.2 统一将比例值从js复制到GPU
    device.queue.writeBuffer(changingStorageBuffer, 0, changingStorageValues);
    // 7.4设置绑定组
    passEncoder.setBindGroup(0, bindGroup);
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
      存储缓冲区, 传递vertex
      <canvas ref={ref} width="500" height="500"></canvas>;
    </div>
  );
};
