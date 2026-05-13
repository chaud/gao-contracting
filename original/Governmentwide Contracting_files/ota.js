function otaPlot() {

  var margin = {top: 60, right: 60, bottom: 50, left: 60};

  var width = 400;
  var height = 300;
  var svgWidth = width + margin.left + margin.right;
  var svgHeight = height + margin.top + margin.bottom;

  var years = otaData.map(d => +d.fy);

  var data;

  var units = "BILLIONS";
  var denominator = 1000000000;
  var org = "Agencies";

  d3.select(".fig5").classed("grayedout", false);

  if(currentFilter == "None") {
    // use all data
    data = groupBy(otaData, ['fy']);

  } else {

    // only use data for selected agency/department
    data = groupBy(otaData.filter(d => d.dept==currentFilter),['fy']);
    org = currentFilter;

    if(data.length==0) {
      // there are no values for this agency so we go back to the full dataset and grey out the figure
      data = groupBy(otaData, ['fy']);
      org = "Agencies";

      d3.select(".fig5").classed("grayedout", true);

    } 
  }

  if(d3.min(data.map(d => (d.value || 0))) < 1000000000) {
    units = "MILLIONS";
    denominator = 1000000;
  };

  var maxval = d3.max(data.map(d => (d.value || 0)/denominator));
  var ticks = [maxval*.25, maxval*.5, maxval*.75, maxval];

  
  // set the scales
  var xScale = d3.scaleLinear()
        .range([0, width])
        .domain(d3.extent(data.map(d => +d.key)))
        ;

  var yScale = d3.scaleLinear()
        .range([height, 0])
        .domain([0, maxval]);


  // define the line
  var line = d3.line()
    .x(d => xScale(+d.key))
    .y(d => yScale((d.value || 0)/denominator));

  
  // Get div to add figure
  var selection = d3.select(".fig5_plot");   

  // remove existing data
  selection.selectAll("svg").remove();

  // add svg
  const svg = selection.append("svg")
    .attr("width", svgWidth)
    .attr("height", svgHeight)
    .append("g")
    .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
    ;

  // add line
    svg.append("path")
    .data([data])
    .attr("class", "line")
    .attr("d", line);

    var dots = svg.selectAll("circles")
        .data(data)
        .enter()
        .append("circle");

    dots
        .attr("fill", "#F15A29")
        .attr("stroke", "none")
        .attr("cx", d => xScale(+d.key))
        .attr("cy", d => yScale((d.value || 0)/denominator))
        .attr("r", 5)
        .on("mouseover", (event, d) => mouseover((d.key + "<br>" + org + "<br>$" + formatNum((d.value || 0)/denominator, 1) + units.slice(0,1))))
        .on("mousemove", mousemove)
        .on("mouseout", mouseout)
        .append("svg:title")
        ;



// Add the x Axis
var xAxis = svg.append("g")
    .attr("class", "ota_xaxis")
    .attr("transform", "translate(0," + height + ")")
    .call(d3.axisBottom(xScale)
            .ticks(5,"d")
            .tickSize(-height)
            );
    
xAxis.select(".domain").remove();

// Add the y Axis
var yAxis = svg.append("g")
    .call(d3.axisLeft(yScale)
            .ticks(4)
            .tickValues(ticks)
            .tickSize(0))
    .attr("transform","translate(-10,0)"); 

yAxis.select(".domain").remove();

// Add label to y axis
svg.append("g")
    .attr("transform","translate(-25," + -10 + ")")
    .append("text")
    .attr("style", "font-size: 9px")
    .attr("class", "ota_yaxis")
    .text("DOLLARS IN " + units)

// append figure title to indicate governmentwide/filtered agency/department
svg.append("g")
.attr("transform","translate(" + (width/2) + ", -30)")
.append("text")
.text(" Other Transactions Reported by " + org)
.attr("class", "ota_plot_title")
;

var fig5_dl = d3.select(".fig5_dl");

fig5_dl.on('mouseover', d => fig5_dl.style('background-color', 'white'))
  .on('mouseout', d => fig5_dl.style('background-color', 'var(--bglight)'))
  .on("click", d => download(csvmaker(otaData), 'ota.csv'));



}