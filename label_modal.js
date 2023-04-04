
var modal = document.getElementById("enter-label");

// Get the button that opens the modal
var modalButton = document.getElementById("add-label");
var labelText = document.getElementById("label-text-input");

// Get the <span> element that closes the modal
var span = document.getElementById("modal-text-close");
// var modalText = document.getElementById("modal-text");

// When the user clicks the button, open the modal 
modalButton.onclick =function(){
  modal.style.display = "block";
  // modalText.innerHTML = "hello, please enter a new label";
}


// When the user clicks on <span> (x), close the modal
span.onclick = function() {
  modal.style.display = "none";
  labelmanager.unmount();
}

// When the user clicks anywhere outside of the modal, close it
window.onclick = function(event) {
  if (event.target == modal) {
    modal.style.display = "none";
    labelmanager.unmount();

  }
}


class Labels{
  constructor(){
    this.labels = {};
    this.labelDisplayDivID = "label-display";
    this.graphDisplayDivID = "graph-display";
    this.graphWidth  = 960;
    this.graphHeight = 500;
    this.labels = [];
    this.graph = new Graph(this.graphDisplayDivID, {});
  }
  addLabel(uncleanedLabel){
    var label = uncleanedLabel.replace(/[^a-z0-9]/gi, '');
    
    if(label in this.labels){
      return [false, "cannot add a label that already exists"];
    } else if(label == ""){
      return [false, "label cannot be empty string"];
    }
    this.labels[label] = null;
    const rect = document.getElementById(this.labelDisplayDivID).getBoundingClientRect();
    const x = Math.trunc((rect.right - rect.left) / 2);
    const y =  Math.trunc((rect.bottom - rect.top) / 2);
    this.graph.nodes.push({
      id: label,
      x: x,
      y: y,
    })
    this.render();
    return [true, null];
    
  }
  editLabel(){

  }
  deleteLabel(){

  }
  render(){
    var labelDisplayDiv = document.getElementById(this.labelDisplayDivID)
    labelDisplayDiv.innerHTML = "";
  
    const rect = document.getElementById(this.labelDisplayDivID).getBoundingClientRect();
    const x = Math.trunc((rect.right - rect.left) / 2);
    const y =  Math.trunc((rect.bottom - rect.top) / 2);

    this.graph.resetMouseVars();
    this.graph.restart();
    this.graph.addNode();
   
    
    
  }
  unmount(){
    if(this.graph !== null){
      document.getElementById(this.labelDisplayDivID).innerHTML = ""
      // this.graph.destroy();
    }

  }
}


// set up SVG for D3
class Graph{
  constructor(divID){
    this.width = 960;
    this.height = 500;
    this.circle_radius = 40;
    this.colors =  d3.scale.category10();
    this.graphSvg = d3.select("#" + divID)
      .append('svg')
      .attr('width', this.width)
      .attr('height', this.height)
      .attr('id', 'graph');

    this.nodes = [];
    this.links = []
  
  
    // line displayed when dragging new nodes
    this.drag_line = this.graphSvg.append('svg:path')
      .attr('class', 'link dragline hidden')
      .attr('d', 'M0,0L0,0');

    // handles to link and node element groups
    this.path = this.graphSvg.append('svg:g').selectAll('path');
    this.circle = this.graphSvg.append('svg:g').selectAll('g');

    // mouse event this.
    this.selected_node = null;
    this.selected_link = null;
    this.mousedown_link = null;
    this.mousedown_node = null;
    this.mouseup_node = null;
    this.force = d3.layout.force()
    .nodes(this.nodes)
    .links(this.links)
    .size([this.width, this.height])
    .linkDistance(150)
    .charge(-500)
    .on('tick', () =>  this.tick(this.path))
    this.graphSvg.on('mousedown', (e) => this.mousedown(e))
    .on('mousemove',() => this.mousemove())
    .on('mouseup', () => this.mouseup())
    d3.select(window)
    .on('keydown',() => this.keydown());
    
  

  }
  addNode(){
    this.restart();
  }
  mousedown( ) {
    // prevent I-bar on drag

    // because :active only works in WebKit?

    this.graphSvg.classed('active', true);
  
    if(this.mousedown_node || this.mousedown_link) return;
  
    this.restart();
  }
  destroy(){
    console.log("destroying");
    d3.select('#graph').remove();
    
  }
  mousemove() {
    if(!this.mousedown_node) return;

    this.drag_line.attr('d', 'M' + this.mousedown_node.x + ',' + this.mousedown_node.y + ' L' + d3.mouse(this.graphSvg.node())[0] + ',' + d3.mouse(this.graphSvg.node())[1]);
  
    this.restart();
  }
  mouseup() {
    if(this.mousedown_node) {
      // hide drag line
      this.drag_line
        .classed('hidden', true)
    }
  
    // because :active only works in WebKit?
    this.graphSvg.classed('active', false);
  
    // clear mouse event vars
    this.resetMouseVars();
  }
  resetMouseVars() {
    this.mousedown_node = null;
    this.mouseup_node = null;
    this.mousedown_link = null;
  }
  tick() {
    // draw directed edges with proper padding from node centers

    this.path.attr('d', (d) => {
      var deltaX = d.target.x - d.source.x,
          deltaY = d.target.y - d.source.y,
          dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY),
          normX = deltaX / dist,
          normY = deltaY / dist,
          sourcePadding = this.circle_radius,
          targetPadding = this.circle_radius,
          sourceX = d.source.x + (sourcePadding * normX),
          sourceY = d.source.y + (sourcePadding * normY),
          targetX = d.target.x - (targetPadding * normX),
          targetY = d.target.y - (targetPadding * normY);
      return 'M' + sourceX + ',' + sourceY + ' L' + targetX + ',' + targetY;
    });
    
    this.circle.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });
  }
  circleMouseUp(d){
    
    if(!this.mousedown_node) return;

    // needed by FF
    this.drag_line
      .classed('hidden', true);

  
    this.mouseup_node = d;
    if(this.mouseup_node === this.mousedown_node) { this.resetMouseVars(); return; }

    // unenlarge target node
    this.circle.attr('transform', function(d) {
      return 'translate(' + d.x + ',' + d.y + ')';
    });

    // add link to graph (update if exists)
    var mousedown_node = this.mousedown_node;
    var mouseup_node = this.mouseup_node;


    var link = this.links.filter(function(l) {

      return ((l.source === mousedown_node && l.target === mouseup_node) || (l.source === mouseup_node && l.target === mousedown_node));
    })[0];
   
  
    if(!link) {
      link = {source: this.mousedown_node, target: this.mouseup_node};
      this.links.push(link);
    }

    // select new link
    this.selected_link = link;
    this.selected_node = null;
    this.restart();
    

  }
  pathMouseDown(d){
    this.mousedown_link = d;
    if(this.mousedown_link === this.selected_link) this.selected_link = null;
    else this.selected_link = this.mousedown_link;
    this.selected_node = null;
    this.restart();

  }
  spliceLinksForNode(node) {
    this.links = this.links.filter(function(l) {
      return !(l.source === node || l.target === node);
    });
  }
  keydown() {

  
    if(!this.selected_node && !this.selected_link) return;
    switch(d3.event.keyCode) {
      case 8: // backspace
      case 46: // delete
        if(this.selected_node) {
          this.nodes.splice(this.nodes.indexOf(this.selected_node), 1);
          this.spliceLinksForNode(this.selected_node);
        } else if(this.selected_link) {
          this.links.splice(this.links.indexOf(this.selected_link), 1);
        }
        this.selected_link = null;
        this.selected_node = null;
        this.restart();
        break;

    }
  }
  
  circleMouseDown(d){
    // select node
    this.mousedown_node = d;
    if(this.mousedown_node === this.selected_node) this.selected_node = null;
    else this.selected_node = this.mousedown_node;
    this.selected_link = null;

    // reposition drag line
  
    this.drag_line
      .classed('hidden', false)
      .attr('d', 'M' + this.mousedown_node.x + ',' + this.mousedown_node.y + 'L' + this.mousedown_node.x + ',' + this.mousedown_node.y);

    this.restart();
  }
  restart() {
    
  
    this.path = this.path.data(this.links);
  
    // update existing links
  
    this.path.classed('selected', (d) =>  { return d === this.selected_link; })
  
  
    // add new links
    this.path.enter().append('svg:path')
      .attr('class', 'link')
      .classed('selected', (d) =>  { return d === this.selected_link; })
      .on('mousedown', (d) =>this.pathMouseDown(d));
  
    // remove old links
    this.path.exit().remove();
  
  
    // circle (node) group
    // NB: the function arg is crucial here! nodes are known by id, not by index!
    this.circle = this.circle.data(this.nodes, function(d) { return d.id; });
  
    // update existing nodes (reflexive & selected visual states)
    var selected_node = this.selected_node;
    this.circle.selectAll('circle')
      .classed('selected', function (d) { return (d === selected_node)})
  
    // add new nodes
    var g = this.circle.enter().append('svg:g');
    g.append('svg:circle')
      .attr('class', 'node')
      .attr('r', this.circle_radius)
      .on('mousedown', (d) => this.circleMouseDown(d))
      .on('mouseup', (d) => this.circleMouseUp(d));
  
    // show node IDs
    g.append('svg:text')
        .attr('x', 0)
        .attr('y', 12)
        .attr('class', 'id')
        .text(function(d) { return d.id; });
  
    // remove old nodes
    this.circle.exit().remove();
  
    // set the graph in motion
   this.force.start();
  }
}



var labelmanager = new Labels();

function addLabel(){
  labelmanager.addLabel(labelText.value);
  labelText.value = "";
}
