import styles from "./App.module.scss";
import { HashRouter, Route, Routes, Outlet } from "react-router-dom";
import HelloTriangle from "./examples/01-HelloTriangle";
import HelloComputed from "./examples/02-HelloComputed";
import InterStageVaribles from "./examples/03-InterStageVariables";
import Uniforms from "./examples/04-Uniforms";
import UniformsMany from "./examples/05-UniformsMany";
import UniformsTwoUniformBuffer from "./examples/06-UniformsTwoUniformBuffer";
import StorageBuffer from "./examples/07-StorageBuffers";
import StorageBufferVertex from "./examples/08-StorageBuffersVertex";
import VertexBuffer from "./examples/09-VertexBuffers";
import VertexBuffer2 from "./examples/10-VertexBuffers2";
import HelloTriangleMSAA from "./examples/HelloTriangleMSAA";

const list = [
  { id: 1, title: "1.0 helloTriangle", img: "", url: "/#/triangle" },
  { id: 2, title: "1.1 用gpu进行计算", img: "", url: "/#/computed" },
  { id: 3, title: "2.0 着色器传值", img: "", url: "/#/stage" },
  { id: 4, title: "2.1 uniforms", img: "", url: "/#/uniforms" },
  { id: 5, title: "2.2 uniforms(1对1)", img: "", url: "/#/uniforms2" },
  { id: 6, title: "2.3 uniforms(多对1)", img: "", url: "/#/uniforms3" },
  { id: 7, title: "2.4 storage", img: "", url: "/#/storage" },
  { id: 8, title: "2.5 storage(传递vertex)", img: "", url: "/#/vertex" },
  { id: 9, title: "2.6 vertex(传递vertex)", img: "", url: "/#/vertex1" },
  {
    id: 10,
    title: "2.7 vertex(传递vertex, offset, color, scale)",
    img: "",
    url: "/#/vertex2",
  },
];

const Home = () => {
  return (
    <div className={styles.home}>
      <div className={styles.nav}>
        {list.map((item) => (
          <a className={styles.item} href={item.url} key={item.id}>
            <img hidden={!item.img} src={item.img} alt={item.title} />
            <span>{item.title}</span>
          </a>
        ))}
      </div>
      <div className={styles.body}>
        <Outlet />
      </div>
    </div>
  );
};

export default () => {
  return (
    <div className={styles.container}>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Home />}>
            <Route path="triangle" element={<HelloTriangle />} />
            <Route path="computed" element={<HelloComputed />} />
            <Route path="stage" element={<InterStageVaribles />} />
            <Route path="uniforms" element={<Uniforms />} />
            <Route path="uniforms2" element={<UniformsMany />} />
            <Route path="uniforms3" element={<UniformsTwoUniformBuffer />} />
            <Route path="storage" element={<StorageBuffer />} />
            <Route path="vertex" element={<StorageBufferVertex />} />
            <Route path="vertex1" element={<VertexBuffer />} />
            <Route path="vertex2" element={<VertexBuffer2 />} />
            <Route path="triangle2" element={<HelloTriangleMSAA />} />
          </Route>
        </Routes>
      </HashRouter>
    </div>
  );
};
