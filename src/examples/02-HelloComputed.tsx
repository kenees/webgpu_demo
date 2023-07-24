// 在GPU上运行计算
//@ts-nocheck
import { useLayoutEffect } from "react";

async function main() {
  // 1. 请求一个适配器
  const adapter = await navigator.gpu?.requestAdapter();
  // 2. 从适配器请求一个设备
  const device = await adapter?.requestDevice();
  if (!device) {
    fail("need a browser that supports WebGPU");
    return;
  }

  // 3. 4. pass, 不需要关联画布
  // 5. 创建着色器模块
  //  包含一个或多个着色器函数
  const module = device.createShaderModule({
    label: "doubling computed module",
    // 首先，我们声明一个名为data类型的变量storage，我们希望能够读取和写入该变量。
    // 我们将其类型声明array<f32>为 32 位浮点值数组
    // 告诉它我们将在group(0) 的 binding(0)的位置指定这个数组。
    // 然后我们声明一个使用属性调用的函数@compute ，使其成为计算着色器。
    // 计算着色器需要声明工作组大小@workgroup_size(1)
    // global_invocation_id 迭代计数器， 三维的
    code: `
        @group(0) @binding(0) var<storage, read_write> data: array<f32>;

        @compute @workgroup_size(1) fn computeSomething(
            @builtin(global_invocation_id) id: vec3<u32>
        ) {
            let i = id.x;
            data[i] = data[i] * 2.0;
        }
    `,
  });
  //  6. 创建计算管道
  const pipeline = device.createComputePipeline({
    label: "doubing compute pipeline",
    layout: "auto",
    compute: {
      module,
      entryPoint: "computeSomething",
    },
  });

  // 7. 准备输入数据
  const input = new Float32Array([1, 2, 3, 4, 5]);
  // create a buffer on the GPU to hold our computation
  // input and output
  const workBuffer = device.createBuffer({
    label: "work buffer",
    size: input.byteLength,
    usage:
      GPUBufferUsage.STORAGE |
      GPUBufferUsage.COPY_SRC |
      GPUBufferUsage.COPY_DST,
  });
  // Copy our input data to that buffer
  device.queue.writeBuffer(workBuffer, 0, input);
  // 8.准备输出数据容器
  // create a buffer on the GPU to get a copy of the results
  const resultBuffer = device.createBuffer({
    label: "result buffer",
    size: input.byteLength,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  //   9.
  // Setup a bindGroup to tell the shader which
  // buffer to use for the computation
  const bindGroup = device.createBindGroup({
    label: "bindGroup for work buffer",
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: workBuffer } }],
  });

  //   10.
  // Encode commands to do the computation
  const encoder = device.createCommandEncoder({
    label: "doubling encoder",
  });
  const pass = encoder.beginComputePass({
    label: "doubling compute pass",
  });
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(input.length);
  pass.end();

  // 11. Encode a command to copy the results to a mappable buffer.
  encoder.copyBufferToBuffer(workBuffer, 0, resultBuffer, 0, resultBuffer.size);

  // 12. Finish encoding and submit the commands
  device.queue.submit([encoder.finish()]);

  // 13. Read the results
  await resultBuffer.mapAsync(GPUMapMode.READ);
  const result = new Float32Array(resultBuffer.getMappedRange().slice());
  resultBuffer.unmap();

  console.log("input", input);
  console.log("result", result);
}

export default () => {
  useLayoutEffect(() => {
    main();
  }, []);

  return <div>computed</div>;
};
