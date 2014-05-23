"use strict";

function Camera(sceneBounds,up) // Compute a generic camera from a given bounding box dimensions. sceneBounds is an object with max and min as properties.
{
	var center = [(sceneBounds.min[0]+sceneBounds.max[0])/2,(sceneBounds.min[1]+sceneBounds.max[1])/2,(sceneBounds.min[2]+sceneBounds.max[2])/2];
	var dx = sceneBounds.max[0]-sceneBounds.min[0], dy = sceneBounds.max[1]-sceneBounds.min[1], dz = sceneBounds.max[2]-sceneBounds.min[2];
	var diagonal = Math.sqrt(dx*dx+dy*dy+dz*dz);

	var c= new Object();
	c.name = "auto";
	c.at = center;
	c.eye = [center[0], center[1], center[2]+diagonal*1.5];
	c.up = (up)?[up[0],up[1],up[2]]:[0,1,0];
	c.near = diagonal*0.1;
	c.far = diagonal*3;
	c.FOV = 30;
	this.bufferSize = 14*4; // 14 floats * 4 bytes per float: O, U, V, W, width, height

	this.getOpenCLdata=function(eye){ // "eye" parameter is optional
		var E = (eye)?eye:c.eye;
		var viewMatrix=mat4.lookAt(E,c.at,c.up);
		var U = [viewMatrix[0],viewMatrix[4],viewMatrix[8]]; 
		var V = [viewMatrix[1],viewMatrix[5],viewMatrix[9]]; 
		var W = [viewMatrix[2],viewMatrix[6],viewMatrix[10]]; 
		var height = 2.0*Math.tan(0.5*c.FOV*Math.PI/180.0);
		var width = (height * canvas.width)/canvas.height;
		var data = new Float32Array([E[0], E[1], E[2], W[0], W[1], W[2], U[0], U[1], U[2], V[0], V[1], V[2], width, height]);
		//console.log("Camera Data length:"+data.length);
		return data;
	}
	this.atData=function(){ 
		return c.at;
	}
	this.getRotatedCameraPosition= function(r){ // "r" is the rotation angle around "up" vector of the camera.
		var t = mat4.identity();
		mat4.translate(t,[c.at[0],c.at[1],c.at[2]]);
		//console.log(t);
		var m = mat4.create();
		mat4.rotate(t,r,c.up,m)
		mat4.translate(m,[-c.at[0],-c.at[1],-c.at[2]]);
		var neweye = mat4.multiplyVec4(m, [c.eye[0],c.eye[1],c.eye[2],1.0], neweye);
		return neweye;
	};
	this.getCameraMatrix=function(eye){
		if (eye) return mat4.lookAt(eye,c.at,c.up);
		else return mat4.lookAt(c.eye,c.at,c.up);
	}
	this.getProjMatrix=function(aspect){ //aspect = gl.canvas.width / gl.canvas.height
		return mat4.perspective(c.FOV,((aspect)?aspect:1.0), c.near , c.far);
	};
	this.getEye= function(){
		return c.eye.slice(0);
	}
}