var canvas;
var camera ={};
var lightSource = 0;
var rotation = 0;
function parseJSON(jsonFile)
{
	var xhttp = new XMLHttpRequest();
	xhttp.open("GET", jsonFile, false);
	xhttp.overrideMimeType("application/json");
	xhttp.send(null);
	return JSON.parse(xhttp.responseText);
}
function getModelBounds(modelData)
{
	// Compute Model dimensions
	// This code doe not create bounds for individual triangles or individual spheres.
	var xmin=Infinity, xmax=-Infinity, 
		ymin=Infinity, ymax=-Infinity, 
		zmin=Infinity, zmax=-Infinity;
	var i,mat,n,k,index;
	for (k=0; k<modelData.nodes.length; k++){
		mat = modelData.nodes[k].modelMatrix;
		if (modelData.nodes[k].meshIndices) {
			for (n = 0; n < modelData.nodes[k].meshIndices.length; n++){
				index = modelData.nodes[k].meshIndices[n];
				for(i=0;i<modelData.meshes[index].vertexPositions.length; i+=3){
					var vertex = mat4.multiplyVec3(mat,[modelData.meshes[index].vertexPositions[i],modelData.meshes[index].vertexPositions[i+1],modelData.meshes[index].vertexPositions[i+2]]);
					if (vertex[0] < xmin) xmin = vertex[0];
					else if (vertex[0] > xmax) xmax = vertex[0];
					if (vertex[1] < ymin) ymin = vertex[1];
					else if (vertex[1] > ymax) ymax = vertex[1];
					if (vertex[2] < zmin) zmin = vertex[2];
					else if (vertex[2] > zmax) zmax = vertex[2];
				}
			}
		}
	}
	var dim= {};
	dim.min = [xmin,ymin,zmin];
	dim.max = [xmax,ymax,zmax];
	return dim;
}
function bound(CellData)
{
	
	var xmin=Infinity, xmax=-Infinity, 
		ymin=Infinity, ymax=-Infinity, 
		zmin=Infinity, zmax=-Infinity,
		xMinTriangle,yMinTriangle,zMinTriangle,
		xMaxTriangle,yMaxTriangle,zMaxTriangle;
	var k,index;
	for (k=0; k<CellData.length; k++){
		index = CellData[k]*9;
		//bounding box for each triangle
		xMinTriangle = Math.min(vertexPositionsData[index],vertexPositionsData[index+3],vertexPositionsData[index+6]);
		yMinTriangle = Math.min(vertexPositionsData[index+1],vertexPositionsData[index+4],vertexPositionsData[index+7]);
		zMinTriangle = Math.min(vertexPositionsData[index+2],vertexPositionsData[index+5],vertexPositionsData[index+8]);
		xMaxTriangle = Math.max(vertexPositionsData[index],vertexPositionsData[index+3],vertexPositionsData[index+6]);
		yMaxTriangle = Math.max(vertexPositionsData[index+1],vertexPositionsData[index+4],vertexPositionsData[index+7]);
		zMaxTriangle = Math.max(vertexPositionsData[index+2],vertexPositionsData[index+5],vertexPositionsData[index+8]);
		if (xMinTriangle < xmin) xmin = xMinTriangle;
		if (xMaxTriangle > xmax) xmax = xMaxTriangle;
		if (yMinTriangle < ymin) ymin = yMinTriangle;
		if (yMaxTriangle > ymax) ymax = yMaxTriangle;
		if (zMinTriangle < zmin) zmin = zMinTriangle;
		if (zMaxTriangle > zmax) zmax = zMaxTriangle;
		
	}
	var dim= {};
	
	dim.min = [xmin,ymin,zmin];
	dim.max = [xmax,ymax,zmax];
	return dim;
}

var diffuseReflectance = [1.0,1.0,1.0];
var ambientReflectance = [1.0,1.0,1.0];
var specularReflectance = [1.0,1.0,1.0];
var shininess = 10.0;
var emissionColor = [0.0,0.0,0.0];
var aspect;
var vertexPositionsData = new Array();
var vertexNormalsData = new Array();
var model;
var lightInfo = new Array();
var cameraCopy = new Array();
var boundingBox = new Array();
var cells = new Array();
var cellsArray = new Array();
var cellsPointers = new Array();
var allBounds = new Array();
var cameraRotAngle = 0;
var modelPath = "models/sampleMesh.json"
function getCellIndex(i,j,k,yResolution,zResolution){
	return(((i*yResolution)+j)*zResolution)+k;
}
function spatialSubdivision(bounds)
{
	var width = bounds.max[0] - bounds.min[0];
    var height = bounds.max[1] - bounds.min[1];
	var depth = bounds.max[2] - bounds.min[2];
	var boxVolume = width * depth * height;
	var N = vertexPositionsData.length/9;
	setTrianglesCount(N);
	var n = 8;
	var a = Math.pow(n*boxVolume/N,1/3);
	//var a = 3*Math.max(width,depth,height)/Math.pow(N,1/3);
	var MaxResolution = 64;
	var xResolution = clamp(Math.round(width/a),1,MaxResolution);
	var yResolution = clamp(Math.round(height/a),1,MaxResolution);
	var zResolution = clamp(Math.round(depth/a),1,MaxResolution);
	var deltaX = width/xResolution;
	var deltaY = height/yResolution;
	var deltaZ = depth/zResolution;
	boundingBox[0] = bounds.min[0];
	boundingBox[1] = bounds.min[1];
	boundingBox[2] = bounds.min[2];
	boundingBox[3] = bounds.max[0];
	boundingBox[4] = bounds.max[1];
	boundingBox[5] = bounds.max[2];
	boundingBox[6] = xResolution;
	boundingBox[7] = yResolution;
	boundingBox[8] = zResolution;
	for(var i=0;i<xResolution;i++) {
		for(var j=0;j<yResolution;j++) {
			for(var k=0;k<zResolution;k++) {
				var cellIndex = getCellIndex(i,j,k,yResolution,zResolution);
				 cells[cellIndex] = [];
				 allBounds[cellIndex] = [];		
			}
		}
	}
	var index = 0;
	for (var l=0;l<vertexPositionsData.length;l+=9) {
		//bounding box for each triangle
		var xMinTriangle = Math.min(vertexPositionsData[l],vertexPositionsData[l+3],vertexPositionsData[l+6]);
		var yMinTriangle = Math.min(vertexPositionsData[l+1],vertexPositionsData[l+4],vertexPositionsData[l+7]);
		var zMinTriangle = Math.min(vertexPositionsData[l+2],vertexPositionsData[l+5],vertexPositionsData[l+8]);
		var xMaxTriangle = Math.max(vertexPositionsData[l],vertexPositionsData[l+3],vertexPositionsData[l+6]);
		var yMaxTriangle = Math.max(vertexPositionsData[l+1],vertexPositionsData[l+4],vertexPositionsData[l+7]);
		var zMaxTriangle = Math.max(vertexPositionsData[l+2],vertexPositionsData[l+5],vertexPositionsData[l+8]);
		var i1 = clamp(Math.floor((xMinTriangle - bounds.min[0])/deltaX),0,xResolution-1);
		var i2 = clamp(Math.floor((xMaxTriangle - bounds.min[0])/deltaX),0,xResolution-1);
		var j1 = clamp(Math.floor((yMinTriangle - bounds.min[1])/deltaY),0,yResolution-1);
		var j2 = clamp(Math.floor((yMaxTriangle - bounds.min[1])/deltaY),0,yResolution-1);
		var k1 = clamp(Math.floor((zMinTriangle - bounds.min[2])/deltaZ),0,zResolution-1);
		var k2 = clamp(Math.floor((zMaxTriangle - bounds.min[2])/deltaZ),0,zResolution-1);
		for(var i=i1;i<=i2;i++) {
			for(var j=j1;j<=j2;j++) {
				for(var k=k1;k<=k2;k++) {
					var cellIndex = getCellIndex(i,j,k,yResolution,zResolution);
					 cells[cellIndex].push(index);
				}
			}
		}
		index++;
	}
	
	var cumN=0;
	var boundLength;
	var miniBound;
	for(var i=0;i<xResolution;i++) {
		for(var j=0;j<yResolution;j++) {
			for(var k=0;k<zResolution;k++) {
				var cellIndex = getCellIndex(i,j,k,yResolution,zResolution); 
				var n = cells[cellIndex].length;
				if(n==0) {
					boundLength = 0;
				} else {
					boundLength = 6;
					miniBound = bound(cells[cellIndex]);
					allBounds[cellIndex].push(miniBound.min[0]);
					allBounds[cellIndex].push(miniBound.min[1]);
					allBounds[cellIndex].push(miniBound.min[2]);				
					allBounds[cellIndex].push(miniBound.max[0]);
					allBounds[cellIndex].push(miniBound.max[1]);
					allBounds[cellIndex].push(miniBound.max[2]);
				}
				
				
				cellsPointers[cellIndex] = cumN;
				cumN = cumN + n + boundLength;
				//The first 6 will be always the bound box values for this Cell
				for(var z=0;z<boundLength;z++) {
					cellsArray.push(allBounds[cellIndex][z]);
				}
				for(var b=0;b<n;b++) {
					cellsArray.push(cells[cellIndex][b]);
				}
			}
		}
	}
	
	cellsPointers[cellsPointers.length]=cumN;
	
	/*for(var i=0;i<xResolution;i++) {
		for(var j=0;j<yResolution;j++) {
			for(var k=0;k<zResolution;k++) {
				var cellIndex = getCellIndex(i,j,k,yResolution,zResolution); 
				console.log(cells[cellIndex].length+" vs "+(cellsPointers[cellIndex+1] - cellsPointers[cellIndex]));
			}
		}
	}*/
	
	//alert(cellsPointers);
}
function cameraAndParseJSON()
{
	model = parseJSON(modelPath);
	if (model.materials[0].diffuseReflectance) {
		diffuseReflectance = model.materials[0].diffuseReflectance;
	} 
	if (model.materials[0].ambientReflectance) {
		ambientReflectance = model.materials[0].ambientReflectance;
	}
	if (model.materials[0].specularReflectance) {
		specularReflectance = model.materials[0].specularReflectance;
	}
	if (model.materials[0].shininess) {
		shininess = model.materials[0].shininess;
	}
	var bounds = getModelBounds(model);
	camera = new Camera(bounds,[0, 1, 0]);

	cameraCopy = camera.getOpenCLdata();

	lightSourceSelected(cameraCopy[0],cameraCopy[1],cameraCopy[2]); 
	lightInfo[0] = diffuseReflectance[0];
	lightInfo[1] = diffuseReflectance[1];
	lightInfo[2] = diffuseReflectance[2];
	lightInfo[3] = ambientReflectance[0];
	lightInfo[4] = ambientReflectance[1];
	lightInfo[5] = ambientReflectance[2];
	lightInfo[6] = specularReflectance[0];
	lightInfo[7] = specularReflectance[1];
	lightInfo[8] = specularReflectance[2];
	lightInfo[9] = shininess;
	lightInfo[10] = light[0];
	lightInfo[11] = light[1];
	lightInfo[12] = light[2];
	lightInfo[13] = light[3];
   
	var i,j,n,k,index,jindex;
	var mat;
	if (model.meshes) {
		for (k=0; k<model.nodes.length; k++){
			mat = model.nodes[k].modelMatrix;
			if (model.nodes[k].meshIndices) {
				for (n = 0; n < model.nodes[k].meshIndices.length; n++){
					index = model.nodes[k].meshIndices[n];
					var mesh = model.meshes[index];
					for(i=0;i<mesh.indices.length; i+=3){
						for (j=0; j<3; j++){ 
							jindex = mesh.indices[i+j]*3;
							var vertex = mat4.multiplyVec3(mat,[mesh.vertexPositions[jindex],mesh.vertexPositions[jindex+1],mesh.vertexPositions[jindex+2]]);
							vertexPositionsData.push(vertex[0]);vertexPositionsData.push(vertex[1]);vertexPositionsData.push(vertex[2]);
							var normal = mat4.multiplyVec4(mat,[mesh.vertexNormals[jindex],mesh.vertexNormals[jindex+1],mesh.vertexNormals[jindex+2],0]);
							vertexNormalsData.push(normal[0]);vertexNormalsData.push(normal[1]);vertexNormalsData.push(normal[2]);
						}
					}
				}
			}
		}
	}
	
	spatialSubdivision(bounds);
	aspect = canvas.width / canvas.height;
	
}
function clamp(val, min, max){
    return Math.max(min, Math.min(max, val))
}
var lightSourceValueChanged = 0;
function setLightSourceValue(){
	if(document.getElementById("NoLight").checked) {
		lightSource = 0;
	} else {
		lightSource = 1;;
	}
	lightSourceValueChanged = 1;
    main();
}
var resoultionChanged = 0;
function resolutionChanged(resolution) {	
	if(resolution == 0) {
		canvas.width = 320;
		canvas.height = 240;
	}
	else if(resolution == 1) {
		canvas.width = 640;
		canvas.height = 480;
	}
	resoultionChanged = 1;
	main();
}
function rotationAngle(angle){
	rotation = 1;
	cameraRotAngle = cameraRotAngle + angle;
    main();
}
var pls_x;
var pls_y;
var pls_z;
var light;
function lightSourceSelected(x,y,z){
    pls_x = x;
    pls_y = y;
    pls_z = z;
	//Point Light Source
	light = [pls_x,pls_y,pls_z,1.0];
  
}
function setTrianglesCount(N){
	document.getElementById("triangles").value = N;
} 
function resetValues()
{
	boundingBox = new Array();
	allBounds = new Array();
	cells = new Array();
	cellsArray = new Array();
	cellsPointers = new Array();
	diffuseReflectance = [1.0,1.0,1.0];
	ambientReflectance = [1.0,1.0,1.0];
	specularReflectance = [1.0,1.0,1.0];
	shininess = 10.0;
	emissionColor = [0.0,0.0,0.0];
	vertexPositionsData = new Array();
	vertexNormalsData = new Array();
	lightInfo = new Array();
	cameraCopy = new Array();
	rotation=0;
	resoultionChanged = 0;
	lightSourceValueChanged = 0;
}
function modelChanged(modelName)
{
	modelPath = modelName;
	resetValues();
	main();
}
function createProgram(ctx,device,src){
	// Create and build program for the first device
	//alert(src);
	var program = ctx.createProgramWithSource(src);

	try {
	program.buildProgram ([device], "");
	} catch(e) {
	alert ("Failed to build WebCL program. Error "
	+ program.getProgramBuildInfo (device, 
	WebCL.CL_PROGRAM_BUILD_STATUS)
	+ ": " 
	+ program.getProgramBuildInfo (device, 
	WebCL.CL_PROGRAM_BUILD_LOG));
	throw e;
	}
	return program;
}

function main()
{
	if (window.WebCL == undefined) {
		alert("your system does not support WebCL.");
		return;
	}
	var time1 = Date.now();
	canvas = document.getElementById("canvas");
	canvasContext = canvas.getContext("2d");
	if(rotation==0 && resoultionChanged == 0 && lightSourceValueChanged==0) {
		cameraAndParseJSON();
	} 
	raster = canvasContext.createImageData(canvas.width,canvas.height);
	
	
	ctx = WebCL.createContextFromType ([WebCL.CL_CONTEXT_PLATFORM, WebCL.getPlatformIDs()[0]], WebCL.CL_DEVICE_TYPE_DEFAULT);
	
	devices = ctx.getContextInfo(WebCL.CL_CONTEXT_DEVICES);
	//Create command queue using the first available device
	queue = ctx.createCommandQueue (devices[0], 0);
	
	program = createProgram(ctx,devices[0],document.getElementById("templateKernel").text); //"templateKernel" is the script id from Assn1.html
	program.buildProgram (devices, "");
	kernel =program.createKernel("getColorForPixel"); // Put your kernel name here.
	// You may have multiple kernels. So you may have multiples of this line with different kernel name
	camerabufSize = 14*4;
	lightbufSize = 14*4;
	rasterBuffer= ctx.createBuffer (WebCL.CL_MEM_READ_ONLY,canvas.width*canvas.height*4);
	cameraBuffer = ctx.createBuffer(WebCL.CL_MEM_READ_ONLY, camerabufSize);
	lightBuffer = ctx.createBuffer(WebCL.CL_MEM_READ_ONLY, lightbufSize);
	if (model.meshes) {
		vertexPositionsBufferSize = vertexPositionsData.length * 4;
		vertexNormalsBufferSize = vertexNormalsData.length * 4;
		vertexPositionsBuffer = ctx.createBuffer(WebCL.CL_MEM_READ_ONLY, vertexPositionsBufferSize);
		vertexNormalsBuffer = ctx.createBuffer(WebCL.CL_MEM_READ_ONLY, vertexNormalsBufferSize);
	}
	boundingBoxBufferSize = boundingBox.length * 4;
	cellsArrayBufferSize = cellsArray.length * 4;
	cellsPointersBufferSize = cellsPointers.length * 4;
	boundingBoxBuffer = ctx.createBuffer(WebCL.CL_MEM_READ_ONLY, boundingBoxBufferSize);
	cellsArrayBuffer = ctx.createBuffer(WebCL.CL_MEM_READ_ONLY, cellsArrayBufferSize);
	cellsPointersBuffer = ctx.createBuffer(WebCL.CL_MEM_READ_ONLY, cellsPointersBufferSize);
	kernel.setKernelArg (0, cameraBuffer);
	kernel.setKernelArg (1, canvas.width, WebCL.types.UINT);
	kernel.setKernelArg (2, canvas.height, WebCL.types.UINT);
	kernel.setKernelArg (3, rasterBuffer);
	if (model.meshes) {
		kernel.setKernelArg (4, vertexPositionsBuffer);
		kernel.setKernelArg (5, vertexNormalsBuffer);
		kernel.setKernelArg (6, vertexPositionsData.length, WebCL.types.UINT);
	}
	if(lightSource == 1) {
		kernel.setKernelArg (7, 1, WebCL.types.UINT);
	} else {
		kernel.setKernelArg (7, 0, WebCL.types.UINT);
	}
	kernel.setKernelArg (8, lightBuffer);
	kernel.setKernelArg (9, boundingBoxBuffer);
	kernel.setKernelArg (10, cellsArrayBuffer);
	kernel.setKernelArg (11, cellsPointersBuffer);
	
	//alert(w + "" + u + "" + v + "" + camera.eye);
	wsSize = kernel.getKernelWorkGroupInfo(devices[0], WebCL.CL_KERNEL_WORK_GROUP_SIZE);
	xSize = Math.floor(Math.sqrt(wsSize)); 
	ySize = Math.floor(wsSize/xSize);
	localWS = [xSize,ySize];
	globalWS = [
		 Math.ceil (canvas.width / localWS[0]) * localWS[0], 
		 Math.ceil (canvas.height / localWS[1]) * localWS[1]
	];
	if(rotation==0) {
		queue.enqueueWriteBuffer(cameraBuffer, true, 0, camerabufSize, new Float32Array(camera.getOpenCLdata()), []);
	} else {
		queue.enqueueWriteBuffer(cameraBuffer, true, 0, camerabufSize, new Float32Array(camera.getOpenCLdata(camera.getRotatedCameraPosition(cameraRotAngle*Math.PI/180))), []);
	}
	
	queue.enqueueWriteBuffer(lightBuffer, true, 0, lightbufSize, new Float32Array(lightInfo), []);
	if (model.meshes) {
		queue.enqueueWriteBuffer(vertexPositionsBuffer, true, 0, vertexPositionsBufferSize, new Float32Array(vertexPositionsData), []);
		queue.enqueueWriteBuffer(vertexNormalsBuffer, true, 0, vertexNormalsBufferSize, new Float32Array(vertexNormalsData), []);
	}
    queue.enqueueWriteBuffer(boundingBoxBuffer, true, 0, boundingBoxBufferSize, new Float32Array(boundingBox), []);
	queue.enqueueWriteBuffer(cellsArrayBuffer, true, 0, cellsArrayBufferSize, new Float32Array(cellsArray), []);
	queue.enqueueWriteBuffer(cellsPointersBuffer, true, 0, cellsPointersBufferSize, new Int32Array(cellsPointers), []);
	queue.enqueueNDRangeKernel(kernel, globalWS.length, [], globalWS, localWS, []);
	
	
	queue.finish (); //Finish all the operations
	var time2 = Date.now();
	htmlConsole = document.getElementById("console");
	htmlConsole.innerHTML = "Rendering Time (ms): " +  (time2  - time1);
	queue.enqueueReadBuffer (rasterBuffer, true, 0, canvas.width*canvas.height*4, raster.data, []); 
	
	canvasContext.putImageData(raster, 0,0);
	
	rasterBuffer.releaseCLResources();
	cameraBuffer.releaseCLResources();
	vertexPositionsBuffer.releaseCLResources();
	vertexNormalsBuffer.releaseCLResources();
	lightBuffer.releaseCLResources();
	boundingBoxBuffer.releaseCLResources();
	cellsArrayBuffer.releaseCLResources();
	cellsPointersBuffer.releaseCLResources();
	queue.releaseCLResources();
	program.releaseCLResources();
	kernel.releaseCLResources();
	ctx.releaseCLResources();
}