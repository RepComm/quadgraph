
import { rect, on } from "./aliases.js";
import { Utils, radians, ndist, dist } from "./math.js";

class Nomial {
    /**
     * @param {Number} coefficient of nomial
     * @param {Number} exponent of nomial
     * @param {String} varname variable of nomial (typically x), an input
     */
    constructor(coefficient, exponent, varname) {
        this.coefficient = coefficient;
        this.varname = varname;
        this.exponent = exponent;
        this.error = "";
    }
    /** Convert this nomial back to string representation
     * @param {Boolean} includePosSign
     * @returns {String}
     */
    toString(includePosSign = true) {
        let result = "";
        if (this.coefficient) {
            if (includePosSign && this.coefficient > 0) result += "+";
            result += this.coefficient;
        }
        if (this.varname) {
            result += this.varname;
        }
        if (this.exponent && this.exponent !== 1) {
            result += "^" + this.exponent;
        }
        return result;
    }
    /**
     * @param {String} str to scan
     * @param {Integer} start to start at
     */
    static scanNumber(str, start) {
        //return str.substring(start).match(/\d+[,.]?\d*|-|\+/)[0];
        for (let i = start; i < str.length; i++) {
            if (!str.charAt(i).match(/\d|-|\+/)) {
                return str.substring(start, i);
            }
        }
        return str.substring(start);
    }
    static scanLetter(str, start) {
        for (let i = start; i < str.length; i++) {
            if (!str.charAt(i).match(/[a-zA-Z]/)) {
                return str.substring(start, i);
            }
        }
        return str.substring(start);
    }
    static scanExponent(str, start) {
        for (let i = start; i < str.length; i++) {
            if (str.charAt(i) === "^") {
                return Nomial.scanNumber(str, i + 1);
            }
        }
        return 1;
    }
    static fromString(formula) {
        let i = 0;
        let error = "";

        let coefficient_str = Nomial.scanNumber(formula, i);
        i += coefficient_str.length;

        let coefficient = 1;
        if (coefficient_str.length > 0) {
            coefficient = parseFloat(coefficient_str);
        }
        if (Number.isNaN(coefficient)) {
            error = coefficient_str + " not a number";
        }

        let varname = Nomial.scanLetter(formula, i);
        i += varname.length;

        let exponent = Nomial.scanExponent(formula, i);
        i += exponent.length;
        exponent = parseFloat(exponent);

        let result = new Nomial(coefficient, exponent, varname);
        result.error = error;
        return result;
    }
    /** Resolves the function given its inputs
     * @param {Map<String, Number} inputs 
     * @returns {Number}
     */
    resolve(inputs) {
        if (this.varname) {
            let keys = Object.keys(inputs);
            let key;

            for (let input in inputs) {
                if (input === this.varname) {
                    return this.coefficient * Math.pow(inputs[input], this.exponent);
                }
            }
            throw "Couldn't find an input for " + this.varname;
        } else {
            return Math.pow(this.coefficient, this.exponent);
        }
    }
}

class Polynomial {
    /** Internal, use Polynomial.fromString
     * @param {Array<String>} components 
     */
    constructor(components) {
        this.components = components;
        this.error = "";
    }
    static scanComponent(str, start) {
        for (let i = start; i < str.length; i++) {
            switch (str.charAt(i)) {
                case "+":
                    if (i === start) break;
                    return str.substring(start, i);
                case "-":
                    if (i === start) break;
                    return str.substring(start, i);
                default:
                    break;
            }
        }
        return str.substring(start);
    }
    /** Generate a polynomial from a string
     * @param {String} formula 
     * @returns {Polynomial}
     */
    static fromString(formula) {
        formula = formula.replace(/ /g, "");
        let components = [];

        let component;
        let error = "";
        for (let i = 0; i < formula.length;) {
            let str = Polynomial.scanComponent(formula, i);

            component = Nomial.fromString(str);
            if (component.error) {
                error += " " + component.error;
            }
            components.push(component);
            i += str.length;
        }
        let result = new Polynomial(components);
        result.error = error;
        return result;
    }
    /** Convert back to string representation
     * May be incorrect if parsing failed
     * @returns {String} representation of polynomial function
     */
    toString() {
        let result = "";
        for (let i = 0; i < this.components.length; i++) {
            if (i !== 0) {
                result += " " + this.components[i].toString();
            } else {
                result += this.components[i].toString(false);
            }
        }
        return result;
    }
    /** Resolve the function given its inputs
     * Essentially a "solve for y"
     * @param {Map<String, Number>} inputs
     * @returns {Number} resolved number
     */
    resolve(inputs) {
        let result = 0;
        for (let i = 0; i < this.components.length; i++) {
            result += this.components[i].resolve(inputs);
        }
        return result;
    }
}

class Parabola {
    /** Create a parabola from a string/math function
     * @param {String} from function to parse
     * Sets error flag when detecting parser errors
     */
    constructor(from) {
        this.polynomial = Polynomial.fromString(from);
        this.error = this.polynomial.error;
    }
    /** Resolves the polynomial given an x value to supply a y (output)
     * @param {Number} x supplied value
     * @returns {Number} y
     */
    getY(x) {
        return this.polynomial.resolve({ x: x });
    }
    /** Resolves the polynomial given input variables to supply an output
     * @param {Map<String,Number>} inputs supplied values
     * @returns {Number} y
     */
    rawResolve (inputs) {
        return this.polynomial.resolve(inputs);
    }
    /** Shallow error detection
     * @returns {String|false} Error message when detected, false when not
     */
    hasError() {
        if (this.error) {
            return this.error;
        }
        try {
            this.polynomial.resolve({ x: Math.random() });
        } catch (ex) {
            return ex;
        }
        return false;
    }
}

/** A renderer for graphing a parabola
 */
class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas renderer element
     * @param {Boolean} renderGrid should the grid render or not
     * @param {Number} gridSpacing coordinate spacing between grid vertices
     */
    constructor(canvas, renderGrid = true, gridSpacing = 1) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.renderGrid = renderGrid;
        this.gridSpacing = gridSpacing;
        this.gridColor = "white";
        this.gridLineWidth = 0.5;

        this.graphingColor = "blue";

        this.needsRender = true;

        this.centerX = 0;
        this.centerY = 0;
        this.left = 0;
        this.right = 0;
        this.top = 0;
        this.bottom = 0;

        this.zoom = 100;

        this.drawRect;
        this.prevDrawRect = { width: 0, height: 0 };

        this.parabola;

        this.cursor = { x: 0, y: 0, localx: 0, localy: 0, };
        this.points = new Array();
        this.nearest = {point:undefined, distance:Infinity};

        this.renderRequestCallback = () => {
            this.render();
        };

        on(window, "resize", () => {
            console.log("Resize");
            this.needsRender = true;
        });

        requestAnimationFrame(this.renderRequestCallback);
    }

    /** Set the page-space (layerX/layerY) cursor position
     * Triggers a render
     * @param {Integer} x 
     * @param {Integer} y
     */
    setCursor(x, y) {
        this.cursor.x = x;
        this.cursor.y = y;
        this.needsRender = true;
    }

    /** Set the origin the viewer is viewing from
     * Triggers a render
     * @param {Integer} x
     * @param {Integer} y 
     */
    setCenter(x, y) {
        this.centerX = x;
        this.centerY = y;
        this.needsRender = true;
    }

    /** Move the origin the viewer is viewing from by some amounts
     * @param {Integer} xa move amount x
     * @param {Integer} ya move amount y
     */
    moveCenter(xa, ya) {
        this.setCenter(this.centerX + xa, this.centerY + ya);
    }

    /** Trigger a render
     * NOTE: May not actually render when <Renderer>.needsRender not true
     */
    render() {
        requestAnimationFrame(this.renderRequestCallback);
        if (!this.needsRender) return;
        this.needsRender = false;

        this.drawRect = rect(this.canvas);
        if (this.prevDrawRect.width !== this.drawRect.width ||
            this.prevDrawRect.height !== this.drawRect.height) {
            this.prevDrawRect.width = this.drawRect.width;
            this.prevDrawRect.height = this.drawRect.height;
            this.canvas.width = this.drawRect.width;
            this.canvas.height = this.drawRect.height;
        }

        this.left = (-this.drawRect.width / 2) / this.zoom;
        this.right = (this.drawRect.width / 2) / this.zoom;
        this.top = (-this.drawRect.height / 2) / this.zoom;
        this.bottom = (this.drawRect.height / 2) / this.zoom;

        this.ctx.save();
        this.ctx.clearRect(0, 0, this.drawRect.width, this.drawRect.height);
        this.ctx.translate(this.drawRect.width / 2, this.drawRect.height / 2);

        this.ctx.scale(-this.zoom, this.zoom);
        this.ctx.lineWidth = this.gridLineWidth / this.zoom;
        this.ctx.translate(-this.centerX, -this.centerY);

        if (this.renderGrid) {
            this.ctx.beginPath();
            let xOffset = Utils.roundTo(this.left + this.centerX, this.gridSpacing);
            for (let x = xOffset; x < this.right + this.centerX; x += this.gridSpacing) {
                this.ctx.moveTo(x, this.top + this.centerY);
                this.ctx.lineTo(x, this.bottom + this.centerY);
            }
            let yOffset = Utils.roundTo(this.top + this.centerY, this.gridSpacing);
            for (let y = yOffset; y < this.bottom + this.centerY; y += this.gridSpacing) {
                this.ctx.moveTo(this.left + this.centerX, y);
                this.ctx.lineTo(this.right + this.centerX, y);
            }
            this.ctx.strokeStyle = this.gridColor;
            this.ctx.stroke();

            this.ctx.save();
            this.ctx.rotate(radians(45));
            this.ctx.beginPath();
            this.ctx.rect(
                -this.gridSpacing / 2,
                -this.gridSpacing / 2,
                this.gridSpacing,
                this.gridSpacing
            );
            this.ctx.fillStyle = "#fff5";
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.restore();
        }

        if (this.parabola && this.parabola instanceof Parabola) {
            this.ctx.beginPath();
            let xOffset = Utils.roundTo(this.left + this.centerX, this.gridSpacing);
            let moveOrLine = false; //False = move, True = line
            let py;
            this.points.length = 0;
            this.nearest.distance = Infinity;
            for (let x = xOffset; x < this.right + this.centerX; x += this.gridSpacing / this.zoom) {
                py = this.parabola.getY(x);
                this.points.push({x:x, y:py});
                if (py > this.bottom + this.centerY) {
                    moveOrLine = false;
                    continue;
                } else if (py < this.top + this.centerY) {
                    moveOrLine = false;
                    continue;
                }
                if (!moveOrLine) {
                    this.ctx.moveTo(x, py);
                    moveOrLine = true;
                } else {
                    this.ctx.lineTo(x, py);
                }
            }

            this.ctx.strokeStyle = this.graphingColor;
            this.ctx.lineWidth = (this.gridLineWidth * 4) / this.zoom;
            this.ctx.stroke();

            this.cursor.localx = -((this.cursor.x - this.drawRect.width / 2) / this.zoom) + this.centerX;
            this.cursor.localy = ((this.cursor.y - this.drawRect.height / 2) / this.zoom) + this.centerY;
            let d;
            for (let p of this.points) {
                d = dist(p.x, p.y, this.cursor.localx, this.cursor.localy);
                if (d < this.nearest.distance) {
                    this.nearest.point = p;
                    this.nearest.distance = d;
                }
            }

            this.ctx.beginPath();
            this.ctx.ellipse(
                this.nearest.point.x,
                this.nearest.point.y,
                0.05, 0.05, 0, 0, Math.PI*2
            );

            this.ctx.strokeStyle = "green";
            this.ctx.lineWidth = (this.gridLineWidth * 4) / this.zoom;
            this.ctx.stroke();
            this.ctx.beginPath();
            this.ctx.moveTo(this.cursor.localx, this.cursor.localy);
            this.ctx.lineTo(this.nearest.point.x, this.nearest.point.y);
            this.ctx.strokeStyle = "red";
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    /** Set the viewed function (triggers a render)
     * @param {Parabola} parabola 
     */
    setParabola(parabola) {
        this.parabola = parabola;
        this.needsRender = true;
    }

    /** Add some zoom to your room..
     * Triggers a render
     * @param {Number} za zoom amount
     */
    addZoom(za) {
        this.zoom -= za;
        if (this.zoom < 8) {
            this.zoom = 8;
        } else if (this.zoom > 400) {
            this.zoom = 400;
        }
        this.needsRender = true;
    }
}

export { Renderer, Parabola };
