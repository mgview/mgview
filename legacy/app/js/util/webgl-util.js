// webgl-util.js

window.requestAnimFrame = (function() {
    return window.requestAnimationFrame ||
        window.webkitRequestAnimationFrame ||
        window.mozRequestAnimationFrame ||
        window.oRequestAnimationFrame ||
        window.msRequestAnimationFrame ||
        function(/* function FrameRequestCallback */ callback, /* DOMElement Element */ element) {
            window.setTimeout(callback, 1000 / 60);
        };
})();

// Render-to-texture

var TextureFramebuffer = Class.extend({
    init: function(context, width, height) {
        this.context = context;
        this.width   = width;
        this.height  = height;

        var gl = this.context;

        this.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
        this.framebuffer.width  = width;
        this.framebuffer.height = height;

        this.texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S,     gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T,     gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        this.renderbuffer = gl.createRenderbuffer();
        gl.bindRenderbuffer(gl.RENDERBUFFER, this.renderbuffer);
        gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, width, height);

        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.texture, 0);
        gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, this.renderbuffer);

        gl.bindTexture(gl.TEXTURE_2D, null);
        gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    },

    destroy: function() {
        this.context.deleteRenderbuffer(this.renderbuffer);
        this.context.deleteFramebuffer(this.framebuffer);
        this.context.deleteTexture(this.texture);
    }
});

// Attributes

function uniformi(ctx, programObj, varName, varValue) {
    var varLocation = ctx.getUniformLocation(programObj, varName);
    if (varLocation == -1) {
        return;
    }

    if      (varValue.length === 4) { ctx.uniform4iv(varLocation, varValue); }
    else if (varValue.length === 3) { ctx.uniform3iv(varLocation, varValue); }
    else if (varValue.length === 2) { ctx.uniform2iv(varLocation, varValue); }
    else                            { ctx.uniform1i(varLocation, varValue); }
}

function uniformf(ctx, programObj, varName, varValue) {
    var varLocation = ctx.getUniformLocation(programObj, varName);
    if (varLocation == -1) {
        return;
    }

    if      (varValue.length === 4) { ctx.uniform4fv(varLocation, varValue); }
    else if (varValue.length === 3) { ctx.uniform3fv(varLocation, varValue); }
    else if (varValue.length === 2) { ctx.uniform2fv(varLocation, varValue); }
    else                            { ctx.uniform1f(varLocation, varValue); }
}

function uniformMatrix(ctx, programObj, varName, transpose, matrix) {
    var varLocation = ctx.getUniformLocation(programObj, varName);
    if (varLocation == -1) {
        return;
    }

    if      (matrix.length === 16) { ctx.uniformMatrix4fv(varLocation, transpose, matrix); }
    else if (matrix.length ===  9) { ctx.uniformMatrix3fv(varLocation, transpose, matrix); }
    else                           { ctx.uniformMatrix2fv(varLocation, transpose, matrix); }
}

function vertexAttribPointer(ctx, programObj, varName, size, VBO) {
    var varLocation = ctx.getAttribLocation(programObj, varName);
    if (varLocation == -1) {
        return;
    }

    ctx.bindBuffer(ctx.ARRAY_BUFFER, VBO);
    ctx.vertexAttribPointer(varLocation, size, ctx.FLOAT, false, 0, 0);
    ctx.enableVertexAttribArray(varLocation);
}

function disableVertexAttribPointer(ctx, programObj, varName){
    var varLocation = ctx.getAttribLocation(programObj, varName);
    if (varLocation !== -1) {
        ctx.disableVertexAttribArray(varLocation);
    }
}

function nextHighestPowerOfTwo(x) {
    --x;
    for (var i = 1; i < 32; i <<= 1) {
        x = x | x >> i;
    }
    return x + 1;
}

// @todo: figure out if matrix copies are unnecessary
var MatrixStack = Class.extend({
    init: function() {
        this.top = mat4.create();
        mat4.identity(this.top);
        this.stack = [];
    },

    push: function(m) {
        if (m) {
            this.stack.push(mat4.create(m));
            this.top = mat4.create(m);
        }
        else {
            this.stack.push(mat4.create(this.top));
        }
    },

    pop: function() {
        if (this.stack.length == 0) {
            throw 'Invalid MatrixStack.pop';
        }
        this.top = mat4.create(this.stack.pop());
        return mat4.create(this.top);
    },

    reset: function() {
        mat4.identity(this.top);
        this.stack = [];
    }
});
