function bubblePlot() {

    // Get div to add figure
    var selection = d3.select(".fig4_plot");   

    // remove existing data
    selection.selectAll("div").remove();

    var margin = {top: 30, right: 20, bottom: 50, left: 20};

    var g1;
    var g2;
    var data;

    var gcolors = {
        'Defense': "var(--primary)",
        'Civilian': "var(--secondary)"
      };

    var compData1 = compData.filter(d => d.pricing != 'OTHER');

    if(currentFilter == "None") {
        g1 = "Defense";
        g2 = "Civilian";
        data = groupBy(compData1, ['dod_civ','competed', 'pricing']);
        
        } else {
        g1 = dod_civLU[currentFilter];
        g2 = currentFilter;

        data = groupBy(compData1.filter(d => d.dod_civ==g1), ['dod_civ','competed','pricing'], g2);
        
    };

    // get maxval to determine radius later
    var maxval = d3.max(data.map(d => d.value));

    // add target div
    var comp = selection.append("div")
        .attr("class", "fig4_competed");

    

    var svgWidth = comp.node().getBoundingClientRect().width
    var width = svgWidth - margin.left - margin.right;
    var svgHeight = comp.node().getBoundingClientRect().height;
    var height =  svgHeight - margin.top - margin.bottom;

    var leftCenter = width * .25;
    var rightCenter = width * .75;

    var pricingLabels = ["FIXED PRICE", "COST TYPE", "TIME AND MATERIAL AND LABOR HOUR"];

    var nonComp = selection.append("div")
        .attr("class", "fig4_notcompeted");

    var labels = selection.append("div")
        .attr("class", "fig4_labels");

    var yScale = d3.scaleOrdinal()
        .domain(pricingLabels)
        .range([height*.125, height*.375, height*.625, height*.875]);

    var xScale = d3.scaleOrdinal()
        .domain([g1, g2])
        .range([leftCenter, rightCenter]);

    var rScale = d3.scaleLinear()
        .domain([0, maxval])
        .range([5, height/8]);

    var colorScale = d3.scaleOrdinal()
        .domain(["Defense","Civilian"])
        .range(["#002856", "#99D3D6"]);



    var g1Comp = d3.sum(data.filter(d => d.key[0]==g1 && d.key[1]=="COMPETED").map(d => d.value));
    var g2Comp = d3.sum(data.filter(d => d.key[0]==g2 && d.key[1]=="COMPETED").map(d => d.value));
    var g1NonComp = d3.sum(data.filter(d => d.key[0]==g1 && d.key[1]=="NOT COMPETED").map(d => d.value));
    var g2NonComp = d3.sum(data.filter(d => d.key[0]==g2 && d.key[1]=="NOT COMPETED").map(d => d.value));
    
    
    // Competed values
    var compSvg = comp.append("svg")
        .attr("height", svgHeight)
        .attr("width", svgWidth)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var compCircles = compSvg.selectAll('g')
        .data(data.filter(d => d.key[1] == "COMPETED"))
        .enter()
        .append('g');
        
        
    compCircles.append('circle')
        .attr("r", d => rScale(d.value))
        .attr("cx", d => xScale(d.key[0]))
        .attr("cy", d => yScale(d.key[2]))
        .attr("fill", d => gcolors[d.key[0]] || "var(--accent)")
        .on("mouseover", (event, d) => {

            if(d.value < 1000000000) {
                mouseover(d.key[0] + "<br>" + initialCaps(d.key[2]) + "<br>" + initialCaps(d.key[1]) + "<br>$" + formatNum(d.value/1000000, 1) + "M");
            } else {
                mouseover(d.key[0] + "<br>" + initialCaps(d.key[2]) + "<br>" + initialCaps(d.key[1]) + "<br>$" + formatNum(d.value/1000000000, 1) + "B"); 
            }})
        .on("mousemove", mousemove)
        .on("mouseout", mouseout)
        ;

    var y_adj = -35;

    compSvg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", height + y_adj)
        .attr("y2", height + y_adj)
        .attr("stroke", "black");

    
    // Total value for g1 competed
    compSvg.append("text")
        .attr("x", leftCenter-20)
        .attr("y", height + 15 + y_adj)
        .text("$" + formatNum(g1Comp/1000000000, 1) + "B")
        .attr("class", "bubble_sum")
        .attr("dy", "0px");

    // Total value for g2 competed
    compSvg.append("text")
        .attr("x", rightCenter-20)
        .attr("y", height + 15 + y_adj)
        .text("$" + formatNum(g2Comp/1000000000, 1) + "B")
        .attr("class", "bubble_sum")
        .attr("dy", "0px")
        ;
    
    compSvg.append("text")
        .attr("x", (width*.25)+5)
        .attr("y", height + 35 + y_adj)
        .text("Competed")
        .attr("class", "bubble_cat")
        .attr("dy", "0px")
        ;

    // g1 label
    compSvg.append("text")
        .attr("x", xScale(g1)-25)
        .attr("y", "-10")
        .text(g1)
        .attr("class", "bubble_sum")
        ;

    // g2 label
    compSvg.append("text")
        .attr("x", xScale(g2)-25)
        .attr("y", "-10")
        .text(g2)
        .attr("class", "bubble_sum")
        ;

    // Not Competed values
    var nonCompSvg = nonComp.append("svg")
        .attr("height", svgHeight)
        .attr("width", svgWidth)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var nonCompCircles = nonCompSvg.selectAll('g')
        .data(data.filter(d => d.key[1] == "NOT COMPETED"))
        .enter()
        .append('g');
        
        
    nonCompCircles.append('circle')
        .attr("r", d => rScale(d.value))
        .attr("cx", d => xScale(d.key[0]))
        .attr("cy", d => yScale(d.key[2]))
        .attr("fill", d => gcolors[d.key[0]] || "var(--accent)")
        .on("mouseover", (event, d) => {
            if(d.value < 1000000000) {
                mouseover(d.key[0] + "<br>" + initialCaps(d.key[2]) + "<br>" + initialCaps(d.key[1]) + "<br>$" + formatNum(d.value/1000000, 1) + "M");
            } else {
                mouseover(d.key[0] + "<br>" + initialCaps(d.key[2]) + "<br>" + initialCaps(d.key[1]) + "<br>$" + formatNum(d.value/1000000000, 1) + "B"); 
            }})
      .on("mousemove", mousemove)
      .on("mouseout", mouseout)
        ;

    
    nonCompSvg.append("line")
        .attr("x1", 0)
        .attr("x2", width)
        .attr("y1", height + y_adj)
        .attr("y2", height + y_adj)
        .attr("stroke", "black");

    nonCompSvg.append("text")
        .attr("x", leftCenter-20)
        .attr("y", height + 15 + y_adj)
        .text("$" + formatNum(g1NonComp/1000000000, 1) + "B")
        .attr("class", "bubble_sum")
        .attr("dy", "0px");

    nonCompSvg.append("text")
        .attr("x", rightCenter-20)
        .attr("y", height + 15 + y_adj)
        .text("$" + formatNum(g2NonComp/1000000000, 1) + "B")
        .attr("class", "bubble_sum")
        .attr("dy", "0px")
        ;

    nonCompSvg.append("text")
        .attr("x", (width*.25)+5)
        .attr("y", height + 35 + y_adj)
        .text("Not competed")
        .attr("class", "bubble_cat")
        .attr("dy", "0px")
        ;

        // g1 label
    nonCompSvg.append("text")
        .attr("x", xScale(g1)-25)
        .attr("y", "-10")
        .text(g1)
        .attr("class", "bubble_sum")
        ;

    // g2 label
    nonCompSvg.append("text")
        .attr("x", xScale(g2)-25)
        .attr("y", "-10")
        .text(g2)
        .attr("class", "bubble_sum")
        ;

    // Labels for circles
    pricingSvg = labels.append("svg")
        .attr("height", svgHeight)
        .attr("width", svgWidth)
        .append("g")
        .attr("transform", "translate(0," + margin.top + ")");

    //["FIXED PRICE", "COST TYPE", "TIME AND MATERIAL AND LABOR HOUR", "OTHER"]
    pricingSvg.append("text")
        .text("Fixed price")
        .attr("x", width/2)
        .attr("y", 7 + yScale("FIXED PRICE"))
        .attr("class", "pricingLabels");

    pricingSvg.append("text")
        .text("Cost type")
        .attr("x", width/2)
        .attr("y", 7 + yScale("COST TYPE"))
        .attr("class", "pricingLabels");

    pricingSvg.append("text")
        .text("Time & material/")
        .attr("x", width/2)
        .attr("y", yScale("TIME AND MATERIAL AND LABOR HOUR"))
        .attr("class", "pricingLabels");

        pricingSvg.append("text")
        .text("labor hour")
        .attr("x", width/2)
        .attr("y", 15 + yScale("TIME AND MATERIAL AND LABOR HOUR"))
        .attr("class", "pricingLabels");

    // pricingSvg.append("text")
    //     .text("Other")
    //     .attr("x", width/2)
    //     .attr("y", 7 + yScale("OTHER"))
    //     .attr("class", "pricingLabels");


    var fig4_dl = d3.select(".fig4_dl");

    fig4_dl.on('mouseover', d => fig4_dl.style('background-color', 'white'))
        .on('mouseout', d => fig4_dl.style('background-color', 'var(--bglight)'))
        .on("click", d => download(csvmaker(compData), 'competition.csv'));

}