function groupsum(group) {
  return d3.sum(group, function(d) {
    return d.obs;
  })
}

function comparator(a, b) {
  return b.value - a.value;
}





function plotTreemap() {


  var width = 600;
  var height = 400;


  var svg = d3.select(".plot1");

  svg.selectAll("svg").remove();
  svg.append("svg")
    .attr("height", height)
    .attr("width", width)
    .append("g");
  
  var treemapLayout = d3.treemap()
    .size([width, height])
    .paddingOuter(20)
    .tile(d3.treemapBinary);

 
  // get dod/civilian groups
  var groups = d3.rollup(deptData,
              groupsum,
              d => d.dod_civ,
              d => d.dept);

  // create hierarchy
  var rootNode = d3.hierarchy(groups)
    .sum(d => d[1])
    .sort((a,b) => a[1] - b[1]);

  
  // create layout
  treemapLayout(rootNode);

  // bind nodes
  var nodes = d3.select('svg g')
    .selectAll('g')
    .data(rootNode.descendants())
    .join('g')
    .attr('transform', function(d) {return 'translate(' + [d.x0, d.y0] + ')'});

  nodes
    .append('rect')
    .attr('width', function(d) { return d.x1 - d.x0; })
    .attr('height', function(d) { return d.y1 - d.y0; })
    .attr("class", "fig1_rect")
    .attr('fill', function(d) { 
      // values may be dept (i.e. GSA, DHS) or type (i.e. Defense, Civilian)
      var dept_type = dod_civLU[d.data[0]] || d.data[0] || 'Total';

      // if no filter is applied, use normal colors
      if(currentFilter=="None") {
        if (dept_type == 'Defense') {
          // return "defense_color fig1_rect";
          return "var(--primary)";
        } else if(dept_type=='Civilian') {
          // return "civilian_color fig1_rect";
          return "var(--secondary)"
        } else {
          // return "total_color fig1_rect";
          return "var(--bgdark)";
        }
      // if a filter is applied, use normal color for selected dept and grey out the rest
      } else {
        // this is the selected dept
        if(currentFilter == d.data[0] && dept_type != "Total") {
          return "var(--accent)";
        // all other departments are greyed out
        } else if (d.data[0] == "Defense" && dod_civLU[currentFilter]=="Defense") {
          return "var(--primary)";
        } else if (d.data[0] == "Civilian" && dod_civLU[currentFilter]=="Civilian") {
          return "var(--secondary)";
        } else {
          // return "total_color fig1_rect";
          return "var(--bgdark)";
        }

      }
    })
    .on("mouseover", (event, d) => {
      
      var tooltip = d3.select(".tooltip");

      tooltip.transition()
        .duration(200)
        .style("opacity", .9);
      tooltip.html((d.data[0] || 'Total Obligations') + "<br>$" + formatNum(d.value/1000000000, 1) + "B")

        ;
      })

    .on("mousemove", mousemove)
    .on("mouseout", mouseout)
    .on("click", function(e, d) {
      // get value of selected tile
      var thisval = d.data[0] || "Total";
      
      
      var fig5 = d3.select(".fig5");

      if(['Defense','Civilian','Total'].includes(thisval)) {
        currentFilter = "None";
      } else if(currentFilter == "None" || currentFilter != d.data[0]) {
          if(['Defense','Civilian','Total'].includes(d.data[0])) {
            // don't filter anything - we only filter on agency/department
            currentFilter = "None";
          } else {
          currentFilter = d.data[0];
          // fig5.classed("grayedout", true);

          
          }

      } else {
        currentFilter = "None";
      }

      // finally, refresh figure
      plotTreemap();
      plotPSC();   
      donutPlot();
      bubblePlot();
      otaPlot();
      

    })

  nodes
    .append('text')
    .attr('dx', 4)
    .attr('dy', 14)
    .style('font', '9px sans-serif')
    .style('fill', function(d) {
      var dept_type = dod_civLU[d.data[0]] || d.data[0] || 'Total';
      if (dept_type == 'Defense') {
        return "white";
      } else {
        return "black";
      }
    })
    .text(function(d) {
      return d.data[0] || 'Total';
    })
    .on("mouseover", (event, d) => mouseover((d.data[0] || 'Total Obligations') + "<br>$" + formatNum(d.value/1000000000, 1) + "B"))
    .on("mousemove", mousemove)
    .on("mouseout", mouseout);


  var fig1_dl = d3.select(".fig1_dl");

  fig1_dl.on('mouseover', d => fig1_dl.style('background-color', 'white'))
    .on('mouseout', d => fig1_dl.style('background-color', 'var(--bglight)'))
    .on("click", d => download(csvmaker(deptData), 'departments.csv'));
  


};

