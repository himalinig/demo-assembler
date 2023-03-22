

class Svg {
    constructor(element, activeLayer, layerInfo) {
        this.name = "svg"
        this.uniqueID = 1;
        this.element = element;
        this.tempElems = [];
        this.layerSelected = activeLayer;
        this.layers = {};
        this.text = {};
        this.layerColors = {};
        layerInfo.forEach(layer => {
            this.layers[layer.name] = {};
            this.layerColors[layer.name] = layer.color;
        });
    }
    relativeMousePosition(point){
        var parentRect = this.element.getBoundingClientRect();
        return {
            x: point.pageX - parentRect.left,
            y: point.pageY - parentRect.top
        }
    }
    validID(){
        var ID = this.uniqueID;
        this.uniqueID += 1;
        return ID;
    }

    addText(point, text, pointIsRelative=false, lineID){
        var color = this.layerColors[this.layerSelected];
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        var textELement = new TextSVG(relativePoint,  this.genTextID(lineID),  text, color)
        this.element.appendChild(textELement.text);
        this.text[textELement.id] = textELement;
        return textELement.id;
    }
    addLine(point, pointIsRelative=false, closed=false){
        var color = this.layerColors[this.layerSelected];
        var line = new Line(this.validID(), closed, color);
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        
        line.appendPoint(relativePoint);
        this.element.appendChild(line.path);
        this.layers[this.layerSelected][line.id] = line;
  
        return line.id;
    }
    getAllIDs(){
        var allIDs = Object.keys(this.layers[this.layerSelected]).map(lineID => lineID);
        return allIDs;
    }
    reRender(){
        this.element.innerHTML = ""
        for (const [_, value] of Object.entries(this.layers)) {
            Object.entries(value).map(([_, line]) => {
                this.element.appendChild(line.path);
                line.reRender();
            });
        }
        this.tempElems.forEach(elem =>{
            this.element.appendChild(elem);
        });
        Object.entries(this.text).forEach(([_, elem])=> {
            this.element.appendChild(elem.text);
            elem.reRender();
        })
    }
 
    getLayerAssembler(layer){
        return Object.entries(this.layers[layer]).map(([_, line]) => {
            return line.getPointsArray();
        })
    }
    getLine(lineID){
        return this.layers[this.layerSelected][lineID];
    }
    genTextID(lineID){
        return lineID + "_text";
    }
    getText(lineID){
        return this.text[this.genTextID(lineID)];
    }
    updateSvgPath(point, lineID, pointIsRelative=false) {
        var relativePoint;
        if(pointIsRelative){
            relativePoint = point;
        } else{
            relativePoint = this.relativeMousePosition(point);
        }
        this.layers[this.layerSelected][lineID].appendPoint(relativePoint);
        return lineID;
    }
    clearTemp(){
        this.tempElems = [];
    }

    moveLines(lineIDs, vec){
        lineIDs.map(id => this.layers[this.layerSelected][id].moveByVector(vec));
    }
    getLinesInPoint(point){
        var selectedIDs = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine]) => {
            if(curLine.pointInRect(point)){
                acc.push(curLine.id)
            }
            return acc;
        }, []);
        return selectedIDs;
    }
    getLinesInRect(rect){
        var selectedIDs = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine])=> {
            if(curLine.inRect(rect)){
                acc.push(curLine.id)
            }
            return acc;
        }, []);
        return selectedIDs;
    }
    getClosestLine(point){
        var relativePoint = this.relativeMousePosition(point);
        var closestLine = Object.entries(this.layers[this.layerSelected]).reduce((acc, [_,curLine])=> {
            var distance = minDistanceToLine(relativePoint, curLine.points);
            if( distance < acc.distance ){
                acc.distance = distance;
                acc.lineID = curLine.id;
            }
            return acc;
        }, {distance: Infinity, lineID: null});
        return closestLine;
    }
    generatePerp(lineID, point){
        var relativePoint = this.relativeMousePosition(point);
        const pickDir = {
            average: null,
            vector: null,
            normals: null,
            normalIndex: null,
            length: null,
            computeNormals(points){
                var pointSum = {
                    x: points[0].x + points[1].x, 
                    y: points[0].y + points[1].y
                }
                var x = Math.abs(points[0].x - points[1].x)
                var y = Math.abs(points[0].y - points[1].y)
                this.length = Math.sqrt(x * x + y * y);
                this.average = {
                    x: pointSum.x / 2.0,
                    y: pointSum.y / 2.0
                };
                this.vector = {
                    x: points[1].x - points[0].x,
                    y: points[1].y - points[0].y,
                };
                var normal1 = {
                    x: (this.vector.y * -1) + this.average.x,
                    y: this.vector.x  + this.average.y,
                }
                var normal2 = {
                    x: this.vector.y + this.average.x,
                    y: (this.vector.x * -1)  + this.average.y,
                }
                this.normals = [normal1, normal2];
                return [this.average, this.normals, length]
            },
            setNormalToRetrieve(index){
                this.normalIndex = index;
            },
            retrieveAverageNormalLength(){
                return [this.average, this.normals[this.normalIndex], this.length];
            },
        }
        var [_, normals] = pickDir.computeNormals(this.getLine(lineID).points);
        var distNormal2 = dist2(relativePoint, normals[1]);
        var distNormal1 = dist2(relativePoint, normals[0]);
        if(distNormal1 < distNormal2){
            pickDir.setNormalToRetrieve(0);
            return pickDir;
        }
        pickDir.setNormalToRetrieve(1);
        return pickDir;
    }
    deleteIDs(IDs){
        IDs.forEach(id =>{
            if(this.genTextID(id) in this.text){
                delete this.text[this.genTextID(id)];
            }
            if(id in this.layers[this.layerSelected]){
                delete this.layers[this.layerSelected][id];
            }
        });
    }
    checkMembership(ID){
        if(ID in this.layers[this.layerSelected]){
            return true;
        }
        return false;
    }
    downloadSVG(){
        var preface = '<?xml version="1.0" standalone="no"?>\r\n';
        var svgBlob = new Blob([preface, this.element.outerHTML], {type:"image/svg+xml;charset=utf-8"});
        var downloadLink = document.createElement("a");
        downloadLink.href = URL.createObjectURL(svgBlob);
        downloadLink.download = this.name;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
    } 
}

class OutlineMode{
    constructor(svg){
        this.outlineID = null;
        this.svg = svg;
    }
    mouseDownHandler(e){
        if(!this.svg.checkMembership(this.outlineID)){
            this.outlineID = this.svg.addLine(e, false, true);
        }
        this.svg.updateSvgPath(e, this.outlineID);
    }
    mouseMoveHandler(e){
        this.svg.getLine(this.outlineID).removePoint();
        this.svg.updateSvgPath(e, this.outlineID);
    }
    mouseUpHandler(){
    }
}

class ConstructionMode{
    constructor(svg){
        this.curLineID = null;
        this.svg = svg;
    }
    mouseDownHandler(e){
        this.curLineID = this.svg.addLine(e);
    }
    mouseMoveHandler(e){
        this.svg.updateSvgPath(e, this.curLineID);
    }
    mouseUpHandler(){

    }
}
class SelectPoints{
    constructor(svg, orientlinemode){
        this.orientlinemode = orientlinemode;
        this.svg = svg;
        this.tolerance = 2;
        this.lineID = null;
        this.circleDict = {};
        this.circleTarget = null;
        this.moveVec = {
            x:0,
            y:0
        };
        this.oldCursorPosition = {
            x:0,
            y:0
        };
    }
    reset(){
        this.lineID = null;
        this.circleDict = {};
        this.circleTarget = null;
        this.moveVec = {
            x:0,
            y:0
        };
        this.oldCursorPosition = {
            x:0,
            y:0
        };
        this.svg.clearTemp();
        this.svg.reRender();

    }
    initSelection(e, passedLineID){
        this.svg.clearTemp();
        this.svg.reRender();
        this.lineID = passedLineID;
        this.renderPoints();
        this.moveVec = {
            x:0,
            y:0
        };
        var point = svg.relativeMousePosition(e);
        this.oldCursorPosition = point;

    }
    mouseDownHandler(e){
    
        var circleTarget = e.target;
        var id = circleTarget.id;
        this.circleTarget = id;
        this.moveVec = {
            x:0,
            y:0
        };
        var point = svg.relativeMousePosition(e);
        this.oldCursorPosition = point;
    }
    clickInPoint(e){
        var circleTarget = e.target;
        var id = circleTarget.id;
        if(id in this.circleDict){
            return true;
        }
        return false;
    }
    mouseMoveHandler(e){
      
        var point = svg.relativeMousePosition(e);
        this.moveVec = {
            x: point.x -  this.oldCursorPosition.x,
            y: point.y -  this.oldCursorPosition.y,
        }
        this.oldCursorPosition = point;
        var circle = this.circleDict[this.circleTarget].circle;
        var index = this.circleDict[this.circleTarget].index;
        circle.moveByVector(this.moveVec);
        this.svg.getLine(this.lineID).movePoint(index, this.moveVec);
        if(layerSelected == orientLayer){
            this.orientlinemode.reComp(this.lineID);
        }

        this.svg.getLine(this.lineID).reRender();
        this.svg.getText(this.lineID).reRender();
        circle.reRender();
    }
    mouseUpHandler(){
        this.circleTarget = null;
    }
    renderPoints(){
        var points = this.svg.getLine(this.lineID).points;
        if(layerSelected == orientLayer){
            points = points.slice(0, 2);
        }
        points.forEach((point, index) => {
            var circleElement = new Circle(point, index, this.tolerance);
            this.circleDict[circleElement.id] = {
                circle: circleElement,
                index: index
            };
            this.svg.tempElems.push(circleElement.circle);
        });
        this.svg.reRender();
    }
    mouseUpHandler(e){
  
        this.lineID = null;
        this.circleDict = {};
        this.circleTarget = null;
        this.moveVec = {
            x:0,
            y:0
        };
        this.oldCursorPosition = {
            x:0,
            y:0
        };
    }
}
class OrientLineMode{
    constructor(svg){
        this.svg = svg;
        this.color = "#00ff00";
        this.baseLength = null;
        this.baseID = null;
        this.orientDict = {};
    }
    reComp(lineID){
        const pickDir = this.orientDict[lineID];
        pickDir.computeNormals(this.svg.getLine(lineID).points);
        var [average, normal, length] = pickDir.retrieveAverageNormalLength();
        this.svg.getLine(lineID).removePoint();
        this.svg.getLine(lineID).removePoint();
        this.svg.getText(lineID).point = average;
        this.svg.getText(lineID).txt = Math.trunc(length).toString();
        this.svg.updateSvgPath(average, lineID, true);
        this.svg.updateSvgPath(normal, lineID, true);
    }
    mouseDownHandler(e){
        if(this.baseID == null){
            this.baseID = this.svg.addLine(e);
            this.svg.updateSvgPath(e, this.baseID);
        }
        else if(this.baseID != null && this.baseLength <= 1){
            this.svg.updateSvgPath(e, this.baseID);
        }
        else{
            const pickDir = this.svg.generatePerp(this.baseID, e);
            this.orientDict[this.baseID] = pickDir;
            var [average, normal, length] = pickDir.retrieveAverageNormalLength();
            this.svg.updateSvgPath(average, this.baseID, true);
            this.svg.updateSvgPath(normal, this.baseID, true);
            this.svg.addText(average, Math.trunc(length).toString(), true, this.baseID);
            this.baseID = null;
            this.baseLength = null;
        }
       
    }
    mouseMoveHandler(e){
        if(this.baseID != null){
            this.svg.getLine(this.baseID).removePoint();
            this.svg.updateSvgPath(e, this.baseID);
        }
    }
    mouseUpHandler(){
        if(this.baseID != null){
            this.baseLength = this.svg.getLine(this.baseID).points.length;
        }
    }
}
class Select{
    constructor(svg, selectpoints){
        this.svg = svg;
        this.selectpoints = selectpoints;
        this.selectionCss = 'path-selection'
        this.selectionBox =  document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        this.selectionBox.setAttribute('fill', 'none')
        this.selectionBox.setAttribute('stroke','gray')
        this.selectionBox.setAttribute('stroke-width', 1)
        this.selectionBox.setAttribute('stroke-dasharray', 4);
        this.svg.tempElems.push(this.selectionBox);
        // this.svg.element.appendChild(this.selectionBox);
        this.selected = [];
        
        this.moveVec = {
            x:0,
            y:0
        };
        this.clickedInSelection = false;
        this.oldCursorPosition = {
            x:0,
            y:0
        };
        this.originalLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionBottomRightCorner = {
            x:0,
            y:0
        };

        this.selectingPoints = false;
    }
    isSelected(){
        return this.selected.length > 0;
    }
    doubleClickHandler(e){
        this.clickedInSelection = false;
        this.resetSelectionBox();
        var closestLine = svg.getClosestLine(e);
        console.log(closestLine);
        var closestLineID = closestLine.lineID;
        this.resetSelection();
        this.selectingPoints = true;
        this.selected = [closestLineID];
        this.selectpoints.initSelection(e, closestLineID);
        
    }
    mouseDownHandler(e){
        if(this.selectingPoints){
            var inPoint = this.selectpoints.clickInPoint(e);
            console.log("inpoint", inPoint);
            if(!inPoint){
                this.selectingPoints = false;
                this.resetSelection();
                this.selectpoints.reset();
                this.startSelection(e);
            }
            this.selectpoints.mouseDownHandler(e, this.selected[0]);
        } else {
             // click is in the selected boxes
            if(this.isSelected() && this.clickInSelected(e)){
                this.clickedInSelection = true;
                this.startSelection(e);
            // click is outside the selection, therefore start new selection
            } else{
                this.resetSelection();
                this.startSelection(e);
            }
        }
    }
    mouseMoveHandler(e){
        if(this.selectingPoints){
            this.selectpoints.mouseMoveHandler(e);
        } else {
            if(this.clickedInSelection){
                this.updateSelectionBox(e);
                this.updateMoveVec(e);
                this.svg.moveLines(this.selected, this.moveVec);
                this.svg.reRender();
                this.svg.tempElems.push(this.selectionBox);
            } else {
                this.updateSelectionBox(e);
                this.setSelectionBox();
                this.setSelectedLines();
            }

        }  
    }
    mouseUpHandler(){
        this.clickedInSelection = false;
        this.resetSelectionBox();
    }
    setSelectedLines(){
        this.selected = this.svg.getLinesInRect([this.selectionLeftTopCorner, this.selectionBottomRightCorner ]);
 
        this.removeCSS();
        for(var i = 0; i < this.selected.length; i++){
            var lineElement = document.getElementById(this.selected[i]);
            lineElement.classList.add(this.selectionCss);
        }
    }
    clickInSelected(e){
        //click point criteria

        //selection box criteria
        if(!this.isSelected()){
            return false;
        }
        
        var point = svg.relativeMousePosition(e);
        var potentialIDs = svg.getLinesInPoint(point);
        const found = potentialIDs.some(r=> this.selected.includes(r))
        return found;
    }
    startSelection(e){
        this.moveVec = {
            x: 0, 
            y: 0,
        };
        this.oldCursorPosition = svg.relativeMousePosition(e);
        this.selectionLeftTopCorner = svg.relativeMousePosition(e);
        this.originalLeftTopCorner = svg.relativeMousePosition(e);
        this.selectionBottomRightCorner = svg.relativeMousePosition(e);
        this.setSelectionBox();

    }
    setSelectionBox(){
        this.selectionBox.setAttribute('x', this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('y', this.selectionLeftTopCorner.y);
        this.selectionBox.setAttribute('width',this.selectionBottomRightCorner.x - this.selectionLeftTopCorner.x);
        this.selectionBox.setAttribute('height', this.selectionBottomRightCorner.y - this.selectionLeftTopCorner.y);
    }
    
    updateSelectionBox(e){
        var point = svg.relativeMousePosition(e);
        var [minX, maxX] = [Math.min(point.x, this.originalLeftTopCorner.x), Math.max(point.x, this.originalLeftTopCorner.x)];
        var [minY, maxY] = [Math.min(point.y, this.originalLeftTopCorner.y), Math.max(point.y, this.originalLeftTopCorner.y)];
        this.selectionLeftTopCorner = {
            x: minX,
            y: minY,
        };

        this.selectionBottomRightCorner = {
            x: maxX,
            y: maxY,
        };
    }
    updateMoveVec(e){
        var point = svg.relativeMousePosition(e);
        this.moveVec = {
            x: point.x -  this.oldCursorPosition.x,
            y: point.y -  this.oldCursorPosition.y,
        }
        this.oldCursorPosition = point;

    }
    removeCSS(){
        var allIDs = svg.getAllIDs();
        for(var i = 0; i < allIDs.length; i++){
            var lineElement = document.getElementById(allIDs[i]);
            lineElement.classList.remove(this.selectionCss);
        }
    }
    resetSelection(){
        this.removeCSS();
        this.selected = [];
        this.selectpoints.reset();
    }
    resetSelectionBox(){
        this.originalLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionLeftTopCorner = {
            x:0,
            y:0
        };
        this.selectionBottomRightCorner = {
            x:0,
            y:0
        };
        this.setSelectionBox();
    }
    deleteSelected(){
        this.svg.deleteIDs(this.selected);
        this.resetSelection();
    }
}

function setup(){
    $("#svg-container").html(svgHTML);
    svgElement = document.getElementById("svgElement");
    mode = document.getElementById("mode");
    layer = document.getElementById("layer");
    if(svg){
        thumbnailsobj.addThumbnail(svg);
    }
    const layerInfo = 
    [
        {
            name: outlineLayer,
            color: "#FF0000",
        },
        {
            name: orientLayer,
            color: "#00FF00",
        },
        {
            name: constructionLayer,
            color: "#000000",
        }
    ]
    svg = new Svg(svgElement,layerSelected, layerInfo);
    var orientlinemode = new OrientLineMode(svg);
    select = new Select(svg, new SelectPoints(svg, orientlinemode));
    var outlinemode = new OutlineMode(svg);
    var constructionmode = new ConstructionMode(svg);
    var eventMap = {};

    eventMap[drawMode] = {};
    eventMap[selectMode] = {};
    eventMap[drawMode][constructionLayer] = constructionmode;
    eventMap[drawMode][outlineLayer] = outlinemode;
    eventMap[drawMode][orientLayer] = orientlinemode;
    eventMap[selectMode][constructionLayer] = select;
    eventMap[selectMode][outlineLayer] = select;
    eventMap[selectMode][orientLayer] = select;
    
    svgElement.addEventListener("mousedown", function (e) {
        pressed = true;
        eventMap[setMode][layerSelected].mouseDownHandler(e);
    });
    
    svgElement.addEventListener("mousemove", function (e) {
        if(pressed){
            eventMap[setMode][layerSelected].mouseMoveHandler(e);
        }
    });
    
    svgElement.addEventListener("mouseup", function () {
        pressed = false;
        eventMap[setMode][layerSelected].mouseUpHandler();
    });
    svgElement.addEventListener("dblclick", function (e) {
        if(setMode == selectMode){
            select.doubleClickHandler(e);
        }
        // Double-click detected
    });
    $(document).keyup(function(e){
        if(e.key === "Backspace") {
            select.deleteSelected()
        }
    });
    thumbnailsobj.render();
}

function rerenderAssemblage(){
    assemblerSetup(thumbnailsobj.export());
}

function downloadSVG(){
    svg.downloadSVG();
}

function changeMode(){
    console.log(mode.value);
    select.resetSelection();
    setMode = mode.value;
}

function changeLayer(){
    console.log(layer.value);
    select.resetSelection();
    layerSelected = layer.value;
    svg.layerSelected = layerSelected;
}
function click(e){
}

class Thumbnails{
    constructor(){
        this.thumbnailDiv = "#thumbnail-container";
        this.thumbnails = {};
        this.numberID = 0;
    }
    generateThumbnailElement(){
        this.numberID += 1;
        var id = this.numberID.toString() + "_thumbnail";
        var thumbnailHTML = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"" + id + "\"x=\"0px\" y=\"0px\" width=\"150px\" height=\"100px\" viewBox=\"0 0 600 400\" enable-background=\"new 0 0 200 200\" xml:space=\"preserve\"></svg>"
        $("#thumbnail-container").append(thumbnailHTML)
        var thumbnail_element = document.getElementById(id);
        thumbnail_element.setAttribute('onclick', "click()")
        thumbnail_element.setAttribute('class', "thumbnail")
        thumbnail_element.setAttribute('x', "10px");
        thumbnail_element.setAttribute('y', "10px");
        thumbnail_element.setAttribute('width', "75px");
        thumbnail_element.setAttribute('height', "50px");
        return thumbnail_element;
    }
    addThumbnail(svg){
        var thumbnailElement = this.generateThumbnailElement();
        svg.element = thumbnailElement;
        this.thumbnails[thumbnailElement.id] = svg;
    }
    render(){
        Object.entries(this.thumbnails).forEach(([_, svg]) => svg.reRender());
    }
    export(){
        return Object.entries(this.thumbnails).map(([_, svg]) => svg);
    }
}


var svgHTML = "<svg class=\"svg\" xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" version=\"1.1\" id=\"svgElement\" x=\"0px\" y=\"0px\" width=\"600px\" height=\"400px\" viewBox=\"0 0 600 400\" enable-background=\"new 0 0 600 400\" xml:space=\"preserve\"></svg>"
var drawMode = "draw";
var selectMode = "select";
var setMode = drawMode;
var pressed = false;
var outlineLayer = "outline";
var orientLayer = "orient";
var constructionLayer = "construction";
var layerSelected = constructionLayer;
var svgElement = null;
var mode = null;
var layer = null;
var svg = null;
var select = null;
var thumbnailsobj = new Thumbnails();

setup();

if (typeof(module) !== "undefined") {
	module.exports.Svg = Svg;
    module.exports.layerInfo = layerInfo;
}
