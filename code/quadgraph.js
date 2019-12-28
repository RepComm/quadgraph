
import { rect, on } from "./aliases.js";
import { Utils, radians, ndist } from "./math.js";

class Nomial {
    constructor(coefficient, exponent, varname) {
        this.coefficient = coefficient;
        this.varname = varname;
        this.exponent = exponent;
        this.error = "";
    }
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
        for (let i = start; i < str.length; i++) {
            if (!str.charAt(i).match(/[0-9]|-|\+/)) {
                return str.substring(start, i);
            }
        }
        // try {
        //     console.log(str.substring(start), str.substring(start).match(/^[0-9]*\.?[0-9]*$/));

        //     return str.substring(start).match(/^[0-9]*\.?[0-9]*$/)[0];
        // } catch (ex) {
        //     //console.log(str.substring(start).match(/^\d*\.?\d*$/));
        //     return "1";
        // }
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
    resolve(inputs) {
        let result = 0;
        for (let i = 0; i < this.components.length; i++) {
            result += this.components[i].resolve(inputs);
        }
        return result;
    }
}

class Parabola {
    constructor(from) {
        this.polynomial = Polynomial.fromString(from);
        this.error = this.polynomial.error;
    }
    getY(x) {
        return this.polynomial.resolve({ x: x });
    }
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

class Renderer {
    /**
     * @param {HTMLCanvasElement} canvas renderer element
     */
    constructor(canvas, renderGrid = true, gridSpacing = 1) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        this.renderGrid = renderGrid;
        this.gridSpacing = gridSpacing;
        this.gridColor = "white";
        this.gridLineWidth = 0.5;

        this.graphingColor = "blue";
        //this.graphingXJump = 0.1;

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

        this.renderRequestCallback = () => {
            this.render();
        };

        on(window, "resize", () => {
            console.log("Resize");
            this.needsRender = true;
        });

        requestAnimationFrame(this.renderRequestCallback);
    }

    setCursor(x, y) {
        this.cursor.x = x;
        this.cursor.y = y;
        this.needsRender = true;
    }

    setCenter(x, y) {
        this.centerX = x;
        this.centerY = y;
        this.needsRender = true;
    }

    moveCenter(xa, ya) {
        this.setCenter(this.centerX + xa, this.centerY + ya);
    }

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

        this.ctx.scale(this.zoom, -this.zoom);
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
            for (let x = xOffset; x < this.right + this.centerX; x += this.gridSpacing / this.zoom) {
                py = this.parabola.getY(x);
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
            this.ctx.lineWidth = (this.gridLineWidth) / this.zoom;
            this.ctx.stroke();

            this.cursor.localx = (this.cursor.x - this.drawRect.width / 2) / this.zoom + this.centerX;
            this.cursor.localy = (this.cursor.y - this.drawRect.height / 2) / this.zoom + this.centerY;
            py = this.parabola.getY(this.cursor.localx);

            if (ndist(py, this.cursor.localy) < 1) {
                this.ctx.rect(this.cursor.localx - 0.05, py - 0.05, 0.1, 0.1);
            }
            this.ctx.strokeStyle = this.graphingColor;
            this.ctx.lineWidth = (this.gridLineWidth * 4) / this.zoom;
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    setParabola(parabola) {
        this.parabola = parabola;
        this.needsRender = true;
    }

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
