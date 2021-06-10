import React, { useEffect, useRef, useState, Suspense } from "react"
import {
    atom,
    useRecoilState,
    selector,
    atomFamily,
    selectorFamily,
    useRecoilValueLoadable,
  } from "recoil";


export const focusedMathField = atom({
    key: 'focusedMathField',
    default: () => console.log(">>> default func"),
});

export const palletRef = atom({
    key: 'palletRef',
    default: null,
})

export const buttonRef = atom({
    key: 'buttonRef',
    default: null,
})

export const functionRef = atom({
    key: 'functionRef',
    default: null,
})