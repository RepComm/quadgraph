"use strict";

class Nomial {
    constructor(coefficient, exponent, varname) {
        this.coefficient = coefficient;
        this.varname = varname;
        this.exponent = exponent;
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
    static scanNumber(str, start) {
        for (let i = start; i < str.length; i++) {
            if (!str.charAt(i).match(/[0-9]|-|\+/)) {
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

        let coefficient = Nomial.scanNumber(formula, i);
        i += coefficient.length;
        coefficient = parseFloat(coefficient);

        let varname = Nomial.scanLetter(formula, i);
        i += varname.length;

        let exponent = Nomial.scanExponent(formula, i);
        i += exponent.length;
        exponent = parseFloat(exponent);

        return new Nomial(coefficient, exponent, varname);
    }
    resolve(inputs) {
        if (this.varname) {
            let keys = Object.keys(inputs);
            let key;
            for (let i = 0; i < keys.length; i++) {
                key = keys[i];
                if (key === this.varname) {
                    return this.coefficient * Math.pow(inputs[key], this.exponent);
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

        for (let i = 0; i < formula.length;) {
            let str = Polynomial.scanComponent(formula, i);

            components.push(Nomial.fromString(str));
            i += str.length;
        }

        return new Polynomial(components);
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
    }
    getY(x) {
        return this.polynomial.resolve({x:x});
    }
    render (ctx, zoom=1) {
        ctx.save();

        ctx.lineWidth = 1/zoom;
        ctx.strokeStyle = "#fff";
        ctx.beginPath();
        ctx.moveTo(-10, this.getY(-10));

        for (let i=-10; i<10; i+=0.1) {
            ctx.lineTo(i, this.getY(i));
        }
        ctx.stroke();

        ctx.restore();
    }
}

function renderGrid (ctx, divisions=20, zoom=1) {
    divisions /= 2;
    ctx.save();

    ctx.lineWidth = 1/zoom;
    for (let x=-divisions; x<divisions; x++) {
        ctx.beginPath();
        ctx.moveTo(x, -divisions)
        ctx.lineTo(x, divisions);

        ctx.moveTo(-divisions, x);
        ctx.lineTo(divisions, x);
        ctx.closePath();

        if (x === 0) {
            ctx.strokeStyle = "#00f";
        } else {
            ctx.strokeStyle = "#aaa";
        }
        ctx.stroke();
    }

    ctx.restore();
}