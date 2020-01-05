
import {Renderer, Parabola} from "./quadgraph.js";
import {get, on} from "./aliases.js";


let canvas = get("canvas");
let renderer = new Renderer(canvas, true, 1);

let formula = get("formula");
let parabola = new Parabola("-1x^3 + 1x");
renderer.setParabola(parabola);

let recalcParabola = ()=>{
    parabola = new Parabola(formula.value);
    let ex;
    if (ex = parabola.hasError()) {
        console.log(ex);
        formula.style["background-color"] = "#f44";
    } else {
        formula.style["background-color"] = "unset";
        renderer.setParabola(parabola);
    }
};
recalcParabola();
on(formula, "keyup", recalcParabola);

on(canvas, "wheel", (evt)=>{
    evt.preventDefault();
    renderer.addZoom( (evt.deltaY * renderer.zoom) / 50 );
});

on(canvas, "mousemove", (evt)=>{
    renderer.setCursor(evt.layerX, evt.layerY);
});

let keys = {};
let move = {x:0, y:0};
let speed = 10;

let handleInput = ()=>{
    move.x = 0;
    move.y = 0;
    if (keys.w) {move.y = -speed/renderer.zoom;}
    if (keys.a) {move.x = speed/renderer.zoom;}
    if (keys.d) {move.x = -speed/renderer.zoom;}
    if (keys.s) {move.y = speed/renderer.zoom;}

    if (keys.w || keys.a || keys.d || keys.s) {
        renderer.moveCenter(move.x, move.y);
    }
};

on(window, "keydown", (evt)=>{
    keys[evt.key] = true;
});

on(window, "keyup", (evt)=>{
    keys[evt.key] = false;
});

setInterval(()=>{
    handleInput();
}, 1000/30);
