//@ts-nocheck
export const CheckWebGPU = () => {
  let result = "Great, your current browser supports WebGPU!";
  if (!navigator.gpu) {
    result = "Your current browser does not support WebGPU!";
  }

  return result;
};
