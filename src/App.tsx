import React, { useState, useLayoutEffect, useEffect } from "react";
import styles from "./App.module.scss";
import { HashRouter, Route, Routes, Outlet } from "react-router-dom";
import HelloTriangle from "./examples/01-HelloTriangle";
import HelloComputed from "./examples/02-HelloComputed";
import InterStageVaribles from "./examples/03-InterStageVariables";
import Uniforms from "./examples/04-Uniforms";
import HelloTriangleMSAA from "./examples/HelloTriangleMSAA";

const list = [
  { id: 1, title: "1.0 helloTriangle", img: "", url: "/#/triangle" },
  { id: 2, title: "1.1 用gpu进行计算", img: "", url: "/#/computed" },
  { id: 3, title: "2.0 着色器传值", img: "", url: "/#/stage" },
  { id: 4, title: "2.1 uniforms传值", img: "", url: "/#/uniforms" },
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
            <Route path="triangle2" element={<HelloTriangleMSAA />} />
          </Route>
        </Routes>
      </HashRouter>
    </div>
  );
};
