import * as d3 from "d3";

var     width = 960,
        height = 660,
        currentYear = 2016;

const   scrollheight = 2900,
        bubbleRadius = {min: 0, max: 35},
        bubbleOpacityHi = 0.85,   
        bubbleOpacityMid = 0.65,
        bubbleOpacityLo = 0.3,  
        fields = ["VPG", "OB", "ONC", "GYN"],
        //fieldColors = {GYN: "#8a3078", OB: "#0079c1", VPG: "#64b556", ONC: "#c87f45"},  
        fieldColors = {GYN: "138,48,120", OB: "0,121,193", VPG: "100,181,86", ONC: "200,127,69"},   
        fieldLabels = [
            {abrv: "GYN", label: "gynaecology", xpos: 0.10, ypos: 75, xpos2: 0.18, xpos3: 1.75, ypos3: 2.125}, 
            {abrv: "OB", label: "obstetrics", xpos: 0.325, ypos: 30, xpos2: 0.38, xpos3: 1.8, ypos3: 1.5}, 
            {abrv: "VPG", label: "reproductive medicine", xpos: 0.53, ypos: 30, xpos2: 0.54, xpos3: 1.15, ypos3: 2.75}, 
            {abrv: "ONC", label: "gynaecologic oncology", xpos: 0.74, ypos: 75, xpos2: 0.75, xpos3: 1, ypos3: 2.45}
        ],
        rankXpositions = [0.25, 0.32, 0.39, 0.43, 0.495, 0.55, 0.6, 0.65, 0.685, 0.735],
        ranklabelpositions = [{x: 0.03, y: 0.2}, {x: 0.15, y: 0.13}, {x: 0.27, y: 0.08}, {x: 0.39, y: 0.05}, {x: 0.51, y: 0.05}, {x: 0.61, y: 0.06}, {x: 0.7, y: 0.08}, {x: 0.78, y: 0.11}, {x: 0.85, y: 0.15}, {x: 0.92, y: 0.2}],
        dotRadius = {uncited: 1.5, cited: 4},
        simvars = {alphaMin: [0.35, 0.2, 0.05], charge: 0.45, theta: 0.8, targetstrength: [0.15, 0.15, 0.1], vdecay: [0.35, 0.5, 0.5]};

var pubsData = [], yearStats = [], yShift, newY = 0, yearRange, yearNo, chart, context, hiddencontext, simulation, colorMap = {}, dragBar, pubsXmax, statXmax, statYmax, statRmax, radiusScale, fieldlabelsG, ranklabelsG, labels, legend1G, legend2G, legend3G, axes2, grid3, axes3, xScale2, yScale2, xAxis2, yAxis2, xScale3, yScale3, xAxis3, yAxis3, previousChart, showLabels, selectedName = "", hover = null, rank = false;

export var currentChart;

export function initialize(stats, pubs, callback){    
    yShift = scrollheight - 0.8*height + 30;

    var statsparsed = [];
    stats.forEach((d,i) => {
        statsparsed.push({
            year: +d.year, 
            field: d.field, 
            pubs: +d.publications, 
            mncs_fix: +d.ncsfixed, 
            mp10_fix: +d.p10fixed
        });    
    });
    
    statXmax = d3.max(statsparsed, d => d.mncs_fix);
    statYmax = d3.max(statsparsed, d => d.mp10_fix);
    statRmax = d3.max(statsparsed, d => d.pubs); 
    yearRange = d3.extent(statsparsed, d => d.year);

    const   vispubs = pubs.filter(f => f.field == "GYN" || f.field == "OB" || f.field == "VPG" || f.field == "ONC"),
            otherPubs = pubs.filter(f => f.field != "GYN" && f.field != "OB" && f.field != "VPG" && f.field != "ONC");

    var pubsparsed = [];
    vispubs.forEach((d,i) => {
        var groupX;
        if(d.field == "GYN"){
            groupX = 0.335;    
            var groupBin = [0.13, 0.33];
        } else if(d.field == "OB"){
            groupX = 0.43;   
            var groupBin = [0.33, 0.53];
        } else if(d.field == "VPG"){
            groupX = 0.54;   
            var groupBin = [0.53, 0.73];
        } else if(d.field == "ONC"){
            groupX = 0.63;   
            var groupBin = [0.73, 0.93];
        }
        
        const   randomfX = Math.random()*0.6*width + 0.07*width, 
                randomfY = Math.random()*0.8*height + 0.05*height;
                
        pubsparsed.push({
            year: +d.year, 
            field: d.field, 
            consort: d.consortium,
            ncs_fix: +d.ncsfixed, 
            p10_fix: +d.p10fixed,
            yearcits: +d.citsyearflex,
            groupX: groupX,
            xtarget_start: groupX*width,
            ytarget_start: 2*height/4,
            ytarget_rank_default: 2.2*height/4,
            x: randomfX,
            y: randomfY, 
            px: randomfX,
            py: randomfY, 
            randomX: groupBin[0] + Math.random()*(groupBin[1] - groupBin[0]),
            color: fieldColors[d.field],
            title: d.title,
            authors: d.author_first + "; " + d.author_et_al,
            source: d.source,
            volume: d.volume,
            issue: d.issue,
            pages: d.pages,
            doi: d.doi
        });    
    });
    
    const   field1pubs = pubsparsed.filter(f => f.field == "GYN"),
            field2pubs = pubsparsed.filter(f => f.field == "OB"),
            field3pubs = pubsparsed.filter(f => f.field == "VPG"),
            field4pubs = pubsparsed.filter(f => f.field == "ONC");
    
    var     htmlfield1 = "<p class='fieldheader'>Gynaecology</p><hr>", 
            htmlfield2 = "<p class='fieldheader'>Obstetrics</p><hr>", 
            htmlfield3 = "<p class='fieldheader'>Reproductive Medicine</p><hr>", 
            htmlfield4 = "<p class='fieldheader'>Gynaecologic Oncology</p><hr>",
            htmlfield5 = "<p class='fieldheader'>Other</p><hr>";
    
    for(let y = 2016; y > 2001; y = y - 1) {
        const   yearpubsfield1 = field1pubs.filter(f => f.year == y),
                yearpubsfield2 = field2pubs.filter(f => f.year == y),
                yearpubsfield3 = field3pubs.filter(f => f.year == y),
                yearpubsfield4 = field1pubs.filter(f => f.year == y);
        
        htmlfield1 += "<p class='yearheader'>" + y + "</p>";
        htmlfield2 += "<p class='yearheader'>" + y + "</p>";
        htmlfield3 += "<p class='yearheader'>" + y + "</p>";
        htmlfield4 += "<p class='yearheader'>" + y + "</p>";
        htmlfield5 += "<p class='yearheader'>" + y + "</p>";
        
        yearpubsfield1.forEach(p => {
            htmlfield1 += "<p class='pubtitle'>" + p.title + "</p>";
            htmlfield1 += "<p class='author'>" + p.authors.toUpperCase() + "</p>";
            htmlfield1 += "<p class='journal'>" + p.source + ", " + p.year + ", " + p.volume;
                
            if (p.issue != "NULL") {
                htmlfield1 +=  "(" + p.issue + ") ";
            }
            
            htmlfield1 += p.pages + "</p>";
            
            if(p.doi != "NULL"){
                htmlfield1 += "<p class='doi'>" + "doi: "  + p.doi + "</p>";
            } else {
                htmlfield1 += "<p class='doi'></p>";
            }
        }); 
        
        yearpubsfield2.forEach(p => {
            htmlfield2 += "<p class='pubtitle'>" + p.title + "</p>";
            htmlfield2 += "<p class='author'>" + p.authors.toUpperCase() + "</p>";
            htmlfield2 += "<p class='journal'>" + p.source + ", " + p.year + ", " + p.volume;
                
            if (p.issue != "NULL") {
                htmlfield2 +=  "(" + p.issue + ") ";
            }
            
            htmlfield2 += p.pages + "</p>";
            
            if(p.doi != "NULL"){
                htmlfield2 += "<p class='doi'>" + "doi: "  + p.doi + "</p>";
            } else {
                htmlfield2 += "<p class='doi'></p>";
            }
        }); 
        
        yearpubsfield3.forEach(p => {
            htmlfield3 += "<p class='pubtitle'>" + p.title + "</p>";
            htmlfield3 += "<p class='author'>" + p.authors.toUpperCase() + "</p>";
            htmlfield3 += "<p class='journal'>" + p.source + ", " + p.year + ", " + p.volume;
                
            if (p.issue != "NULL") {
                htmlfield3 +=  "(" + p.issue + ") ";
            }
            
            htmlfield3 += p.pages + "</p>";
            
             if(p.doi != "NULL"){
                htmlfield3 += "<p class='doi'>" + "doi: " + p.doi + "</p>";
            } else {
                htmlfield3 += "<p class='doi'></p>";
            }
        }); 
        
        yearpubsfield4.forEach(p => {
            htmlfield4 += "<p class='pubtitle'>" + p.title + "</p>";
            htmlfield4 += "<p class='author'>" + p.authors.toUpperCase() + "</p>";
            htmlfield4 += "<p class='journal'>" + p.source + ", " + p.year + ", " + p.volume;
                
            if (p.issue != "NULL") {
                htmlfield4 +=  "(" + p.issue + ") ";
            }
            
            htmlfield4 += p.pages + "</p>";
                        
             if(p.doi != "NULL"){
                htmlfield4 += "<p class='doi'>" + "doi: "  + p.doi + "</p>";
            } else {
                htmlfield4 += "<p class='doi'></p>";
            }
        }); 
        
        otherPubs.forEach(p => {
            htmlfield5 += "<p class='pubtitle'>" + p.title + "</p>";
            htmlfield5 += "<p class='author'>" + p.author_first.toUpperCase() + "; " + p.author_et_al.toUpperCase() + "</p>";
            htmlfield5 += "<p class='journal'>" + p.source + ", " + p.year + ", " + p.volume;
                
            if (p.issue != "NULL") {
                htmlfield5 +=  "(" + p.issue + ") ";
            }
            
            htmlfield5 += p.pages + "</p>";
            
             if(p.doi != "NULL"){
                htmlfield5 += "<p class='doi'>" + "doi: "  + p.doi + "</p>";
            } else {
                htmlfield5 += "<p class='doi'></p>";
            }
        });     
    } 

    document.getElementById("pubsfield1").innerHTML = htmlfield1;
    document.getElementById("pubsfield2").innerHTML = htmlfield2;
    document.getElementById("pubsfield3").innerHTML = htmlfield3;
    document.getElementById("pubsfield4").innerHTML = htmlfield4;
    document.getElementById("pubsfield5").innerHTML = htmlfield5;
        
    pubsXmax = d3.max(pubsparsed, d => d.ncs_fix);  
    const pubsRmax = d3.max(pubsparsed, d => d.yearcits);  
    radiusScale = d3.scaleSqrt().domain([0, pubsRmax]).range([2, bubbleRadius.max]);
    
    var nextColor = 1;
    function generateColor(){
        var ret = [];
        if (nextColor < 16777215){
            ret.push(nextColor & 0xff); //R
            ret.push((nextColor & 0xff00) >> 8); //G
            ret.push((nextColor & 0xff0000) >> 16); //B
            nextColor += 1;
        }
        var color = "rgb(" + ret.join(',') + ")";
        return color;
    }
    
    pubsparsed.forEach((d,i) => {
        var authors = d.authors.split("; "), authorsl = [];
        authors.forEach(a => {authorsl.push(a.toLowerCase())});
        d.authorArray = authorsl;
            
        const stats = statsparsed.filter(f => f.field == d.field && f.year == d.year)[0];
        d.fradius = radiusScale(d.yearcits);
        
        if(stats){
            d.mncs_fix = stats.mncs_fix;
            d.mp10_fix = stats.mp10_fix;   
            d.pubs = stats.pubs;
        } 
        
        d.id = i;
        d.hiddenColor = generateColor();
        colorMap[d.hiddenColor] = d;
    });    
    
    var year = yearRange[0];
    while(year < yearRange[1] + 1){
        for (let f = 0; f < 4; f++) {
            const yearSelection = pubsparsed.filter(d => d.year == year && d.field == fields[f]);
            yearSelection.sort((a, b) => {
                if (a.yearcits < b.yearcits)
                    return 1;
                if (a.yearcits > b.yearcits)
                    return -1;
                return 0;
            });

            const items = yearSelection.length;
            for (let i = 0; i < 10; i++) {
                if(i < items){
                    var index = pubsparsed.indexOf(yearSelection[i]);
                } 
                if(index != -1){
                    pubsparsed[index].rank = i + 1;
                    pubsparsed[index].xtarget_rank = rankXpositions[i] * width;
                    
                    if(i == 0){
                       pubsparsed[index].mean = true;
                    }
                }
            }
        }
        year += 1;
    }
    
    pubsparsed.forEach((d,i) => {
        var xtargets_year = [], ytargets_year = [], xtargets_rank = [], ytargets_rank = [], opacities = [], strokeopacities = [];
        for(let y = yearRange[0]; y <= yearRange[1]; y++){
           if(y == +d.year){
                xtargets_year.push(d.xtarget_start);
                ytargets_year.push(1.7*height/4);
                strokeopacities.push(1); 
               
               if(d.rank > 0) {
                    xtargets_rank.push(d.xtarget_rank);
                    ytargets_rank.push(1.7*height/4); 
                    opacities.push(bubbleOpacityMid);
               } else {
                    xtargets_rank.push(d.xtarget_start);
                    ytargets_rank.push(2.2*height/4);
                    opacities.push(bubbleOpacityLo);
               } 
           } else {
                xtargets_year.push(d.xtarget_start);
                ytargets_year.push(2.2*height/4);
                xtargets_rank.push(d.xtarget_start);
                ytargets_rank.push(2.2*height/4);
                opacities.push(bubbleOpacityLo);
                strokeopacities.push(0);
           }
        }
        
        d.xtarget_year = xtargets_year;
        d.ytarget_year = ytargets_year;
        d.xtarget_rank = xtargets_rank;
        d.ytarget_rank = ytargets_rank;
        d.opacity = opacities;
        d.strokeopacity = strokeopacities;
        
        if(i == 0){
            yearNo = opacities.length;
        }
    })
        
    function shuffleArray(array) {
        for(let i = array.length - 1; i > 0; i--) {
            var j = Math.floor(Math.random() * (i + 1)),
                temp = array[i];
            array[i] = array[j];
            array[j] = temp;
        }
        return array;
    }
    
    yearStats = shuffleArray(statsparsed);
    pubsData = shuffleArray(pubsparsed);
    
    currentChart = 1;
    slider();
    drawChartBasis(callback);
}

function drawChartBasis(callback) {
    d3.select("#chartsvg").selectAll("svg").remove();
    d3.select("#chartlabels").selectAll("svg").remove();
    d3.select("#dragbar").selectAll("svg").remove();
    
    const svg = d3.select("#chartsvg").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g");
    
    chart = svg.append("g")
        .attr("id", "scrollchart")
        .attr("transform", "translate(0,0)");
    
    const chartG = chart.append("g")
        .attr("id", "fieldgraph")
        .attr("transform", "translate(0," + (-yShift) + ")");

    const labelsvg = d3.select("#chartlabels").append("svg")
        .attr("width", width)
        .attr("height", height)
        .append("g");
    
        labels = labelsvg.append("g")
            .attr("id", "labellayer")
            .attr("transform", "translate(0,0)");
    
    const labelsG = labels.append("g")
            .attr("id", "fieldgraph")
            .attr("transform", "translate(0," + (-yShift) + ")");
    
    const dragsvg = d3.select("#dragbar").append("svg")
        .attr("width", 124)
        .attr("height", height)
        .append("g");
    
    dragBar = dragsvg.append("rect")
        .attr("class", "scrollbg")
        .attr("x", 40)
        .attr("width", 84)
        .attr("height", height)
        .attr("fill", "#fff")
        .attr("opacity", 0)
        .attr("ypos", 0);
    
    dragsvg.call(d3.drag().on("drag", translateChart));
    
    const tickFormatter = d3.format("d");
    
    xScale2 = d3.scaleLinear()
        .range([2*dotRadius.cited, width - 2*dotRadius.cited])    
        .domain([0, 1]);
 
    yScale2 = d3.scaleLinear()
        .range([scrollheight, 140])
        .domain([0, pubsXmax]);
        
    xAxis2 = d3.axisBottom(xScale2);
    
    yAxis2 = d3.axisLeft(yScale2)
        .ticks(30)
        .tickFormat(d => {if(d == 0){return "";} else {return tickFormatter(d);}})
        .tickSizeInner(50)
        .tickSizeOuter(0); 
    
    xScale3 = d3.scaleLinear()
        .range([(2*bubbleRadius.max -10), width - 4.5*bubbleRadius.max])    
        .domain([0, statXmax + 0.2]);    
 
    yScale3 = d3.scaleLinear()
        .range([0.85*height - 85, 0])
        .domain([0, 10*statYmax + 0.4]);
    
    radiusScale = d3.scaleSqrt().domain([0, statRmax]).range([0, bubbleRadius.max]);
    
    xAxis3 = d3.axisTop(xScale3)
        .tickValues([1])
        .tickSizeInner(0)
        .tickFormat(d => tickFormatter(d));
    
    yAxis3 = d3.axisRight(yScale3)
        .tickValues([1,2,3])
        .tickSizeInner(0)
        .tickFormat(d => tickFormatter(d)); 
    
    axes2 = chartG.append("g")
        .attr("id","axes2group")
        .style("opacity", 0);

    axes2.append("g")
        .attr("class", "y axis yaxis2")
        .attr("transform", "translate(" + 118 + ",0)")
        .call(yAxis2)
        .call(shiftLabels2);
    
    function shiftLabels2(selection) {
        selection.selectAll('text')
            .attr('transform', 'translate(50,12)');
    }
    
    axes2.append("text")
        .attr("class", "axislabel axislabel2")
        .text("Normalized Citation Score (✕ world average)")
        .attr("x", 68)
        .attr("y", yScale2(12.9))
    
    axes2.append("text")
        .attr("class", "instruction")
        .text("↓ drag chart")
        .attr("x", 68)
        .attr("y", yScale2(12.4))
    
    grid3 = chartG.append("g")
        .attr("id","gridgroup")
        .style("opacity", 0);
        
    grid3.append("rect")
        .attr("class", "grid3rect1")
        .attr("x", xScale3(1))
        .attr("y", yScale3(1) + yShift)
        .attr("width", xScale3(statXmax + 0.2) - xScale3(1))
        .attr("height", yScale3(0)-yScale3(1))
        .style("fill", "#303a13")
        .style("fill-opacity", 0.025);
    
    grid3.append("rect")
        .attr("class", "grid3rect1")
        .attr("x", xScale3(0))
        .attr("y", yScale3(10*statYmax + 0.4) + yShift)
        .attr("width", xScale3(1) - xScale3(0))
        .attr("height", yScale3(1)-yScale3(10*statYmax + 0.4))
        .style("fill", "#303a13")
        .style("fill-opacity", 0.025);
    
    grid3.append("rect")
        .attr("class", "grid3rect2")
        .attr("x", xScale3(0))
        .attr("y", yScale3(1) + yShift)
        .attr("width", xScale3(1) - xScale3(0))
        .attr("height", yScale3(0)-yScale3(1))
        .style("fill", "#303a13")
        .style("fill-opacity", 0.06);
    
    grid3.append("rect")
        .attr("class", "grid3rect3")
        .attr("x", xScale3(1))
        .attr("y", yScale3(10*statYmax + 0.4) + yShift)
        .attr("width", xScale3(statXmax + 0.2) - xScale3(1))
        .attr("height", yScale3(1)-yScale3(10*statYmax + 0.4))
        .style("fill", "#fff")
        .style("fill-opacity", 0.1);
    
    grid3.append("line")
        .attr("class", "gridline3")
        .attr("x1", xScale3(0))
        .attr("x2", xScale3(statXmax + 0.2))
        .attr("y1", yScale3(1) + yShift)
        .attr("y2", yScale3(1) + yShift)
        .style("stroke", "#fff")
        .style("stroke-opacity", 0.6)
    
    grid3.append("line")
        .attr("class", "gridline3")
        .attr("x1", xScale3(0))
        .attr("x2", xScale3(statXmax + 0.2))
        .attr("y1", yScale3(2) + yShift)
        .attr("y2", yScale3(2) + yShift)
        .style("stroke", "#fff")
        .style("stroke-opacity", 0.6);
    
    grid3.append("line")
        .attr("class", "gridline3")
        .attr("x1", xScale3(0))
        .attr("x2", xScale3(statXmax + 0.2))
        .attr("y1", yScale3(3) + yShift)
        .attr("y2", yScale3(3) + yShift)
        .style("stroke", "#fff")
        .style("stroke-opacity", 0.6);
    
     grid3.append("line")
        .attr("class", "gridline3")
        .attr("x1", xScale3(1))
        .attr("x2", xScale3(1))
        .attr("y1", yScale3(0) + yShift)
        .attr("y2", yScale3(10*statYmax + 0.4) + yShift)
        .style("stroke", "#fff")
        .style("stroke-opacity", 0.6);
     
      grid3.append("line")
        .attr("class", "gridline3")
        .attr("x1", xScale3(2))
        .attr("x2", xScale3(2))
        .attr("y1", yScale3(0) + yShift)
        .attr("y2", yScale3(10*statYmax + 0.4) + yShift)
        .style("stroke", "#fff")
        .style("stroke-opacity", 0.6);

        axes3 = chartG.append("g")
            .attr("id","axes3group")
            .style("opacity", 0);
 
        axes3.append("g")
            .attr("class", "x axis xaxis3")
            .attr("transform", "translate(0," + (0.85*height + yShift) + ")")
            .call(xAxis3)
            .call(shiftXLabels);
    
        function shiftXLabels(selection) {
            selection.selectAll('text')
                .attr('transform', 'translate(-8,-90)');
        }
    
        axes3.append("g")
            .attr("class", "y axis yaxis3")
            .attr("transform", "translate(" + (2*bubbleRadius.max) + "," + yShift + ")")
            .call(yAxis3)
            .call(shiftYLabels);
    
        function shiftYLabels(selection) {
            selection.selectAll('text')
                .attr('transform', 'translate(-2,12)');
        }
        
   axes3.append("text")
        .attr("class", "axislabel")
        .text("Relative Presence in Top 10% of the field (✕ world average)")
        .attr("x", 68)
        .attr("y", yScale3(3.37) + yShift)
    
    axes3.append("text")
        .attr("class", "axislabel")
        .text("Mean Normalized Citation Score (✕ world average)")
        .attr("x", xScale3(statXmax + 0.18))
        .attr("y", yScale3(0.05) + yShift)
        .attr("text-anchor", "end")
    
    legend1G = chartG.append("g")
        .attr("id", "legend1")
        .attr("transform", "translate(" + (width - 40) + "," + (yShift + height - 238) + ")")
        .style("opacity", 0)
    
    const legendentries1 = legend1G.selectAll(".legenditem1")
        .data([{text: "15", radius: radiusScale(15)},{text: 50, radius: radiusScale(50)},{text: 100, radius: radiusScale(100)}])
        .enter().append("g")
        .attr("class", "legenditem1")
        .attr("transform", (d,i) => "translate(0," + i*(d.radius + 15) + ")");
    
    legendentries1
        .append("circle")
        .attr("r", d => d.radius)
        .attr("fill", "#999")
        .attr("fill-opacity", 0.2)
        .attr("stroke", "#1b4e71")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.25)
    
    legendentries1
        .append("text")
        .attr("class", "legendtext")
        .attr("x", 0)
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .text(d => d.text);
    
    legend1G.append("text")
        .attr("class", "legendtitle")
        .attr("x", -25)
        .attr("y", -60)
        .attr("dx", 0)
        .attr("dy", 0)
        .text("average citations per year")
        .call(wrapText, 60)
    
    legend2G = chartG.append("g")
        .attr("id", "legend2")
        .attr("transform", "translate(" + 630 + "," + (yShift + 25) + ")")
        .style("opacity", 0)
    
    const legendentries2 = legend2G.selectAll(".legenditem2")
        .data([{text: "Among the top 10% most cited publications", radius: 1.3*dotRadius.cited},{text: "Cited publication", radius: dotRadius.cited},{text: "Uncited publication", radius: dotRadius.uncited}])
        .enter().append("g")
        .attr("class", "legenditem2")
        .attr("transform", (d,i) => {if(i == 0){return "translate(0,0)";} else if(i == 1){return "translate(0,20)";} else {return "translate(150,20)";}});
    
    legendentries2
        .append("circle")
        .attr("r", d => d.radius)
        .attr("fill", "#999")
        .attr("fill-opacity", 0.4)
        .attr("stroke", "#1b4e71")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.45)
    
    legendentries2
        .append("text")
        .attr("class", "legendtext2")
        .attr("x", 12)
        .attr("y", 5)
        .attr("text-anchor", "start")
        .text(d => d.text);

    
    legend3G = chartG.append("g")
        .attr("id", "legend3")
        .attr("transform", "translate(" + (width - 65) + "," + (yShift + height - 320) + ")")
        .style("opacity", 0)
    
    const legendentries3 = legend3G.selectAll(".legenditem3")
        .data([{text: "25", radius: radiusScale(25)},{text: 75, radius: radiusScale(75)},{text: 150, radius: radiusScale(150)}])
        .enter().append("g")
        .attr("class", "legenditem3")
        .attr("transform", (d,i) => "translate(0," + i*(d.radius + 20) + ")");
    
    legendentries3
        .append("circle")
        .attr("r", d => d.radius)
        .attr("fill", "#999")
        .attr("fill-opacity", 0.2)
        .attr("stroke", "#1b4e71")
        .attr("stroke-width", 1)
        .attr("stroke-opacity", 0.25)
    
    legendentries3
        .append("text")
        .attr("class", "legendtext")
        .attr("x", 0)
        .attr("y", 5)
        .attr("text-anchor", "middle")
        .text(d => d.text);
    
    legend3G.append("text")
        .attr("class", "legendtitle")
        .attr("x", -50)
        .attr("y", -60)
        .attr("dx", 0)
        .attr("dy", 0)
        .text("annual number of publications")
        .call(wrapText, 100)
    
    fieldlabelsG = labelsG.append("g").attr("id", "fieldlabels");
    ranklabelsG = labelsG.append("g").attr("id", "ranklabels");    
    
    d3.select("#maincanvas").selectAll("canvas").remove();
    d3.select("#hiddencanvas").selectAll("canvas").remove();

    const   canvas = d3.select("#maincanvas").append("canvas")
                    .classed('mainCanvas', true)
                    .attr("width", width)
                    .attr("height", height),
    
            hiddenCanvas = d3.select('#hiddencanvas').append('canvas')
		           .classed('hiddenCanvas', true)
	               .attr("width", width)
                    .attr("height", height);
    
    context = canvas.node().getContext("2d");
    hiddencontext = hiddenCanvas.node().getContext("2d");
    
    d3.select('.mainCanvas').on('mousemove', function(){
		var mouseX = d3.event.layerX || d3.event.offsetX, 
            mouseY = d3.event.layerY || d3.event.offsety,
            color = hiddencontext.getImageData(mouseX, mouseY, 1, 1).data,
            colorKey = 'rgb(' + color[0] + ',' + color[1] + ',' + color[2] + ')',
		    nodeData = colorMap[colorKey];

        if(nodeData){  
            if(currentChart == 1){
                var radius = nodeData.fradius;
            } else if(currentChart == 2){
                if(nodeData.ncs_fix == 0){
                    var radius = dotRadius.uncited;
                } else if(nodeData.p10_fix > 0){
                    var radius = 1.3*dotRadius.cited;
                } else {
                    var radius = dotRadius.cited;
                }
            } else if(currentChart == 3){
                if(nodeData.mean){
                    var radius = radiusScale(nodeData.pubs);
                } else {
                    var radius = 0;
                }    
            }
                    
            const dd2 = Math.pow(mouseX - (nodeData.x + radius), 2) + Math.pow(mouseY - (nodeData.y + newY), 2);
            
		      if(dd2 < radius*radius){
                hover = nodeData.id;
                showPubDetails(nodeData);
                ticked();
              } else {
                hidePubDetails();
              }
		} else {
            hidePubDetails();
        }
	})
    
    drawChart1(callback);
}

function ticked() {
    context.clearRect(0, 0, width, height); 
    hiddencontext.clearRect(0, 0, width, height);
       
    pubsData.forEach(drawNode);
    
    function drawNode(d) { 
        var linewidth = 1;
        
        if(currentChart == 1 || currentChart == 2){
            var radius = d.fradius,
                color = d.color,
                stroke = fieldColors[d.field];
            
            if(d.year == 2015 || d.year == 2016){
                var opacity = bubbleOpacityMid,
                    strokeopacity = 1;
            } else {
                var strokeopacity = 0;
                if(!rank){
                    var opacity = bubbleOpacityLo;
                } else {
                    var opacity = d.opacity[(yearNo - 1) - (yearRange[1] - currentYear)];
                }
            }
            
            if(currentChart == 2) {
                if(d.ncs_fix == 0){
                    radius = dotRadius.uncited;
                } else if(d.p10_fix > 0){
                    radius = 1.3*dotRadius.cited;
                } else {
                    radius = dotRadius.cited;
                }
                
                if(d.year == currentYear){
                    stroke = "70,70,70";
                    strokeopacity = 1;
                } 
            }
        
            if(d.id == hover){
                color = "204,0,0";
                opacity = 1;
                stroke = "0,0,0";
                strokeopacity = 1;
            } else if(selectedName != "" && (d.authorArray.indexOf(selectedName) != -1)){
                color = "204,0,0";
                opacity = bubbleOpacityHi;
                stroke = "204,0,0";
            } 
        
        } else if(currentChart == 3){
            if(d.mean){            
                var radius = radiusScale(d.pubs),
                    color = fieldColors[d.field],
                    stroke = fieldColors[d.field];
                 
                if(d.year == 2015 || d.year == 2016){
                    var opacity = bubbleOpacityMid,
                        strokeopacity = 1;
                } else {
                    var opacity = d.opacity[(yearNo - 1) - (yearRange[1] - currentYear)],
                        strokeopacity = 0;
                }
                
                if(d.year == currentYear){
                    opacity = 0.9;
                    stroke = "70,70,70";
                    strokeopacity = 1;
                    linewidth = 1.5;
                }
                
                if(d.id == hover){
                    color = "204,0,0",
                    opacity = 1,
                    stroke = "0,0,0";
                    strokeopacity = 1;
                    linewidth = 1.5;
                }   
            } else {
                var radius = 0,
                    opacity = 0;
            }
         
            if(opacity == 0){
                var strokeopacity = 0;
            } 
        };      
        
        context.beginPath();
        context.arc(d.x + radius, d.y + newY, radius, 0, 2 * Math.PI);
        context.fillStyle = "rgba(" + color + "," + opacity + ")";
        context.fill();
        context.lineWidth = linewidth;
        context.strokeStyle = "rgba(" + stroke + "," + strokeopacity + ")";
        context.stroke();
        
        hiddencontext.beginPath();
        hiddencontext.arc(d.x + radius, d.y + newY, radius, 0, 2 * Math.PI);
        hiddencontext.fillStyle = d.hiddenColor;
        hiddencontext.fill(); 
    }
}

function drawChart1(callback) {    
    var recentyears = pubsData.filter(f => f.year == 2015 || f.year == 2016),
        otheryears = pubsData.filter(f => f.year != 2015 && f.year != 2016);
    
    recentyears.sort((a, b) => {
        if (a.fradius < b.fradius)
            return 1;
        if (a.fradius > b.fradius)
            return -1;
        return 0;
    });
    
    otheryears.sort((a, b) => {
        if (a.fradius < b.fradius)
            return 1;
        if (a.fradius > b.fradius)
            return -1;
        return 0;
    });
    
    pubsData = otheryears.concat(recentyears);    
    
    simulation = d3.forceSimulation()
        .nodes(pubsData)
        .force("charge", d3.forceManyBody().strength(d => -simvars.charge*d.fradius).theta(simvars.theta).distanceMax(width)) 
        .force("targetX", d3.forceX().x(d => d.xtarget_start).strength(simvars.targetstrength[0]))
        .force("targetY", d3.forceY().y(d => d.ytarget_start).strength(simvars.targetstrength[0]))
        .velocityDecay(simvars.vdecay[0])
        .alphaMin(simvars.alphaMin[0])
        .on("tick", ticked)
        .on("end", ended)
    
    function ended() {
        if(currentChart == 1 && !rank && !showLabels){
            showLabels = true; fieldlabelsG.selectAll(".fieldlabel").transition().ease(d3.easeLinear).duration(500).style("fill-opacity", 1);
            legend1G.transition().duration(500).style("opacity", 1);                
            document.getElementById("slidercontainer").classList.remove("inactive");
            document.getElementById("filters").classList.remove("inactive");
            document.getElementById("pulledinfo").style.visibility = "";
        }
    }
    
    const fieldlabel = fieldlabelsG.selectAll("text.fieldlabel")
        .data(fieldLabels);
    
    fieldlabel.enter().append("text")
        .attr("class", "fieldlabel")
        .attr("x", d => d.xpos*width)
        .attr("y", d => d.ypos + yShift)
        .attr("text-anchor", "start")
        .text(d => d.label)
        .style("fill-opacity", 0);
    
    const ranklabel = ranklabelsG.selectAll("text.ranklabel")
        .data(ranklabelpositions);
    
    ranklabel.enter().append("text")
        .attr("class", "ranklabel")
        .attr("x", d => d.x*width)
        .attr("y", d => d.y*height + yShift)
        .attr("text-anchor", "start")
        .text((d,i) => {return i + 1;})
        .style("fill-opacity", 0);

    if(callback){
        callback();
    }    
} 
    
function updateChart1() {    
    grid3.style("opacity", 0); 
    axes3.style("opacity", 0);
    axes2.style("opacity", 0); 
    
    legend2G.style("opacity", 0);
    legend3G.style("opacity", 0);
    
    simulation.force("charge", null);
    simulation.force("targetX", null);
    simulation.force("targetY", null);
    
    simulation.force("charge", d3.forceManyBody().strength(d => -simvars.charge*d.fradius).theta(simvars.theta).distanceMax(width)) 
    simulation.force("targetX", d3.forceX().x(d => d.xtarget_start).strength(simvars.targetstrength[0]));
    simulation.force("targetY", d3.forceY().y(d => d.ytarget_rank_default).strength(simvars.targetstrength[0]));

    simulation.alphaMin(simvars.alphaMin[0]);
    simulation.velocityDecay(simvars.vdecay[0]);
    simulation.alpha(1);
    simulation.restart();    

    fieldlabelsG.selectAll(".fieldlabel").transition().ease(d3.easeLinear).duration(5000)
        .attr("x", d => d.xpos*width)
        .attr("y", d => d.ypos + yShift);    
    
}     
      
function updateChart2() {
    grid3.transition().transition().duration(750).style("opacity", 0); 
    axes3.transition().transition().duration(750).style("opacity", 0);    
    axes2.transition().duration(1500).style("opacity", 1);
       
    legend1G.transition().duration(750).style("opacity", 0);
    legend2G.transition().duration(750).style("opacity", 1);
    legend3G.transition().duration(750).style("opacity", 0);
    ranklabelsG.selectAll(".ranklabel").transition().duration(750).style("fill-opacity", 0);

    fieldlabelsG.selectAll(".fieldlabel").transition().ease(d3.easeLinear).duration(2500)
        .attr("x", d => xScale2(d.xpos2))
        .attr("y", height/2 - 170 + yShift)
        .style("fill-opacity", 1);

    simulation.force("charge", null);
    simulation.force("targetX", null);
    simulation.force("targetY", null);
    simulation.force("targetX", d3.forceX().x(d => xScale2(d.randomX)).strength(simvars.targetstrength[1]));
    simulation.force("targetY", d3.forceY().y(d => yScale2(d.ncs_fix) - yShift).strength(simvars.targetstrength[1]));
    
    simulation.alphaMin(simvars.alphaMin[1]);
    simulation.velocityDecay(simvars.vdecay[1]);
    simulation.alpha(1);
    simulation.restart();    
}
    
function updateChart3() {
    grid3.transition().duration(1500).style("opacity", 1); 
    axes3.transition().duration(1500).style("opacity", 1);
    axes2.transition().duration(750).style("opacity", 0); 
    ranklabelsG.selectAll(".ranklabel").transition().duration(750).style("fill-opacity", 0);
    
    fieldlabelsG.selectAll(".fieldlabel").transition().ease(d3.easeLinear).duration(2500)
        .attr("x", d => xScale3(d.xpos3))
        .attr("y", d => yScale3(d.ypos3) + yShift)
        .style("fill-opacity", 1);
    
    legend1G.transition().duration(750).style("opacity", 0);
    legend2G.transition().duration(750).style("opacity", 0);
    legend3G.transition().duration(750).delay(1500).style("opacity", 1);
    
    simulation.force("charge", null);
    simulation.force("targetX", null);
    simulation.force("targetY", null);
    simulation.force("targetX", d3.forceX().x(d => xScale3(d.mncs_fix)).strength(simvars.targetstrength[2]));
    simulation.force("targetY", d3.forceY().y(d => yScale3(10*d.mp10_fix)).strength(simvars.targetstrength[2]));
    
    simulation.alphaMin(simvars.alphaMin[2]);
    simulation.velocityDecay(simvars.vdecay[2]);
    simulation.alpha(1);
    simulation.restart();      
}
    
export function swapChart(chartNo) {
    previousChart = currentChart;
    currentChart = chartNo;
    simulation.stop();
    rank = false;
    showLabels = false;
    
    if(previousChart == 2){
        newY = 0;
        chart.transition().ease(d3.easeLinear).duration(1000)
            .attr("transform", "translate(0,0)")
            .attr("ypos",0);
        
        labels.transition().ease(d3.easeLinear).duration(1000)
            .attr("transform", "translate(0,0)")
            .attr("ypos",0);
    }
        
    if(currentChart != previousChart){
        if(currentChart == 1){
            document.getElementById("dragbar").style.display = "none"; 
            document.getElementById("rankbutton").style.display = ""; 
            document.getElementById("filters").classList.add("inactive");
            document.getElementById("clusterbutton").style.display = "none"; 
            document.getElementById("slidercontainer").classList.add("inactive");
            document.getElementById("selectAuthor").style.visibility = ""; 
            document.getElementById("byline").innerHTML = "All publications of the period 2002 — 2017 sorted by research field.<br> Publications by the NVOG consortiums are shown in yellow.<br> Use the sort buttons to view the articles that are cited most often.";
            document.getElementById("pulledinfo").innerHTML = "<p id='pointerinstruction'>hover over the publication dots for more details</p>";
            updateChart1();
        } else if (chartNo == 2){
            document.getElementById("dragbar").style.display = ""; 
            document.getElementById("rankbutton").style.display = "none"; 
            document.getElementById("clusterbutton").style.display = "none";
            document.getElementById("slidercontainer").classList.remove("inactive");
            document.getElementById("filters").classList.remove("inactive");
            document.getElementById("selectAuthor").style.visibility = ""; 
            document.getElementById("byline").innerHTML = "The higher the normalized citation score, the larger the article's impact.<br>Use the year slider to highlight the articles published in a specific year<br> (dark outline).<br><br>";
            document.getElementById("pulledinfo").innerHTML = "<p id='pointerinstruction'>hover over the publication dots for more details</p>";
            updateChart2();
        } else if (chartNo == 3){
            selectedName = "";   
            document.getElementById("dragbar").style.display = "none"; 
            document.getElementById("selectAuthor").style.visibility = "hidden";
            document.getElementById("rankbutton").style.display = "none"; 
            document.getElementById("clusterbutton").style.display = "none";
            document.getElementById("slidercontainer").classList.remove("inactive");
            document.getElementById("byline").innerHTML = "The impact of the total annual publication output per research field.<br>The upper right corner corresponds to the highest impact.<br><br>";
            document.getElementById("pulledinfo").innerHTML = "<p id='pointerinstruction'>hover over the field bubbles for more details</p>";
            updateChart3();
        }  
    }   
}   
         
function translateChart() { 
    var oldY = +dragBar.attr("ypos");
    newY = oldY + d3.event.dy;
    
    if(newY < 0) {
        newY = 0;
    } else if (newY > yShift) {
        newY = yShift;
    }
        
    dragBar.attr("ypos", newY);
    
    chart
        .transition()
        .duration(0)
        .attr("transform", "translate(0," + newY + ")")
    
    labels
        .transition()
        .duration(0)
        .attr("transform", "translate(0," + newY + ")")
            
    ticked();
}
  
function slider(){  
    d3.select("#slider").selectAll("svg").remove();
    
    const   margin = {right: 10, left: 50},
            containerw = parseInt(d3.select("#slider").style('width')),
            sliderw = containerw - margin.left - margin.right,
            sliderh = 40,
            sliderX = d3.scaleLinear().domain([2002, 2016]).range([0, sliderw]).clamp(true);
        
    const   slidersvg = d3.select("#slider").append("svg").attr("width", sliderw + margin.left + margin.right).attr("height", sliderh),
            slider = slidersvg.append("g").attr("class", "slider").attr("transform", "translate(" + margin.left + "," + 6 + ")");

    slider.append("line")
        .attr("class", "track")
        .attr("x1", sliderX.range()[0])
        .attr("x2", sliderX.range()[1] + 5)
        .select(function() { return this.parentNode.appendChild(this.cloneNode(true)); })
        .attr("class", "track-overlay")
        .call(d3.drag()
            .on("start.interrupt", function() { slider.interrupt()})
            .on("drag", function() { updateSlider(sliderX.invert(d3.event.x))})
            .on("end", function() {updateSlider(sliderX.invert(d3.event.x)); showYear(null, Math.round(sliderX.invert(d3.event.x)))}));

    const   handle = slider.insert("rect", ".track-overlay")
                .attr("class", "handle")
                .attr("width", 8)
                .attr("height", 18)
                .attr("x", sliderX(2016))
                .attr("y", 6)
                .attr("rx", 6)
                .attr("ry", 6),
        
            handleTxt = slider.append("text")
                .attr("class", "handletxt")
                .attr("x", sliderX(2016) - 5)
                .attr("y", 22)
                .attr("text-anchor", "end")
                .text(2016);
    
    function updateSlider(h) {
        handle.attr("x", sliderX(h));
        handleTxt.attr("x", sliderX(h) - 5).text(Math.round(h));
        
        hidePubDetails();
        if(currentChart == 3){
            document.getElementById("pulledinfo").innerHTML = "<p id='pointerinstruction'>hover over the field bubbles for more details</p>";
        } else {
            document.getElementById("pulledinfo").innerHTML = "<p id='pointerinstruction'>hover over the publication dots for more details</p>";
        }
    }    
}

export function showYear(mode, year) {    
    if(year){
        currentYear = year;
    }
        
    if(currentChart == 1){
        simulation.stop();
        simulation.force("targetX", null);
        simulation.force("targetY", null);
        
        if(mode == "all"){
            rank = false;
        } else if(mode == "rank") {
            rank = true;
        }
                
        if(!rank){
          simulation.force("targetX", d3.forceX().x(d => d.xtarget_year[(yearNo - 1) - (yearRange[1] - currentYear)]).strength(simvars.targetstrength[0]));
            simulation.force("targetY", d3.forceY().y(d => d.ytarget_year[(yearNo - 1) - (yearRange[1] - currentYear)]).strength(simvars.targetstrength[0]));
         
            ranklabelsG.selectAll(".ranklabel").transition().style("fill-opacity", 0);
            fieldlabelsG.selectAll(".fieldlabel").transition().ease(d3.easeLinear).duration(1000).attr("y", d => d.ypos + yShift);

        } else { 
            simulation.force("targetX", d3.forceX().x(d => d.xtarget_rank[(yearNo - 1) - (yearRange[1] - currentYear)]).strength(simvars.targetstrength[0]));
            simulation.force("targetY", d3.forceY().y(d => d.ytarget_rank[(yearNo - 1) - (yearRange[1] - currentYear)]).strength(simvars.targetstrength[0]));
            
           fieldlabelsG.selectAll(".fieldlabel").transition().ease(d3.easeLinear).duration(1000).attr("y", height/2 + yShift);
            ranklabelsG.selectAll(".ranklabel").transition().duration(1500).style("fill-opacity", 1);
        }
        
        simulation.alpha(1);
        simulation.restart();   
        
    } else {
        ticked();
    }
}
    
export function searchName(name) { 
    selectedName = name.toLowerCase();
    ticked();
}    
    
function showPubDetails(pubdata) {    
    if(currentChart != 3){
        var authors = pubdata.authors.toUpperCase();
        if(authors.length > 200){
            authors = authors.substr(1, 200) + "...";
        }
        
        var htmlContent = "<p class='pubtitle'>" + pubdata.title + "</p>";
            htmlContent += "<p class='author'>" + authors + "</p>";
            htmlContent += "<p class='journal'>" + pubdata.source + ", " + pubdata.year + ", " + pubdata.volume;
                
        if (pubdata.issue != "NULL") {
            htmlContent +=  "(" + pubdata.issue + ") ";
        }
            
        if (pubdata.pages != "NULL") {
           htmlContent += pubdata.pages + "</p>";
        }
     
        document.getElementById("pulledinfo").innerHTML = htmlContent;
    } else if (pubdata.mean){
        const field = fieldLabels.filter(f => f.abrv == pubdata.field)[0].label;
                
        var htmlContent = "<p class='fieldtitle'>" + field + "</p>";
        htmlContent += "<p class='fieldcount'>" + pubdata.pubs + " publications in " + pubdata.year + "</p>";
        
        document.getElementById("pulledinfo").innerHTML = htmlContent;
    }
}
    
export function hidePubDetails() {
    hover = null;
    ticked();
    
    if(currentChart != 3){
       document.getElementById("pulledinfo").innerHTML = "<p id='pointerinstruction'>hover over the publication dots for more details</p>";
    } else {
        document.getElementById("pulledinfo").innerHTML = "<p id='pointerinstruction'>hover over the field bubbles for more details</p>";
    }
}   
    
function wrapText(text, width) { 
    text.each(function() {
        var text = d3.select(this),
            words = text.text().split(/\s+/).reverse(),
            word,
            line = [],
            lineNumber = 0,
            lineHeight = 15,
            x = text.attr("x"),
            y = text.attr("y"),
            dx = text.attr("dx"),
            dy = 10,
            tspan = text.text(null).append("tspan").attr("x", x).attr("dx", dx).attr("y", y).attr("dy", dy);
        while (word = words.pop()) {
            line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = text.append("tspan").attr("x", x).attr("dx", dx).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy).text(word);
        }
        }
    });
}