var Network = Network || {};
var UILib = UILib || {};

var Network = {

    // size of the visualization canvas, the position of the force network on the canvas and the X position of the network center in the force environment
    width: 980,
    height: 680,
    networktranslation: 210,
    networkXcenter: 0.7,
    
    colorfilter: "affiliation", // starting display of the visualization
    layout: "PInetwork",

    // set info window appearance in css
    tooltip: Tooltip("vis-tooltip", 280), // node mouseover info window
    tooltip2: Tooltip("vis-tooltip2", 240), // link mouseover info window
    
    nodeProp: {
        "fillcolorsaffiliation": ['#c2b1d0','#433151','#683899','#eee','#ebe6f0'], // normal fill colors by affiliation (0: AMC, 1: VU, 2: both, 3: other location, 4: light version)
        "fillcolorsrestype": ['#da7d81', '#658cc4', '#a1a1a1', '#6a1d78', '#932214', '#0c3883', '#276c40', '#eee'], // normal fill colors by research type (0: type 1, 1: type 2, 2: type 3, 3: type 1+2, 4: type 1 + 3, 5: type 2 + 3, 6: type 1+2+3, 7: light grey)
        "fillcolorsearched":'#e58e1c', // fill color of item from PI search
        "strokecolorhi": '#333', // stroke color of item upon mouseover (neighboring) node or link
        "strokecolorsearched": '#c87b17', // stroke color of PI searched
        "strokecolorselected": '#111', // stroke color of selected research area
        "strokecolornotselectedaffiliation": '#dad1e3', // stroke color of the nodes in the background of the selected research area network
        "strokecolornotselectedrestype": '#ddd', // stroke color of the nodes in the background of the selected research area network
        "strokewidth": 1.0, // normal stroke width
        "strokewidthhi": 2.0, // stroke of item upon mouseover (neighboring) node/link or search
        "strokewidthselected": 1.5 // stroke of item in selected research area network
    },
    
    linkProp: {
        "strokecolor": '#bbb', // normal stroke color
        "strokewidth": 1.0, // normal stroke width
        "strokewidthhi": 1.2, // stroke width of the selected research area network
        "strokecolorhi": '#333', // stroke upon mouseover node/link
        "strokeopacity": 0.8, // normal stroke opacity
        "strokeopacitylo": 0.5, // stroke opacity when all links to a moused-over node are highlighted
        "strokeopacityhi": 1.0 // stroke opacity upon mouseover node/link
    },
    
    headerProp: {
        "colorselected": '#666', 
        "colornotselected": '#ddd'
    },
    
    legendProp: {
        "textcolor": '#777',
    },
    
    networkCircleRadius: {"min": 10, "max": 25},
    resAreaCircleRadius: [10, 8], // radius of the nodes in the grouped layout, first entry = PI, second entry = PhD
    numberofAreas: 12, // number of different research areas that people are grouped by
    maxResAreaID: 14,
    inRow: 5, // number of people per row in the department grouping
    rowdX: 21, // spacing between people in the rows of the department grouping
    rowdY: -21,
    xShiftStacks: -185,
    firstrowYFactor: 2.7,
    secondrowYFactor: 1.12,
    headerdX: -10, // offset of the research area text header with respect to the first row
    headerdY: 30,
    legenddX: 30,
    legenddY: 20,
    sizelegenddX: 380,
    sizelegenddY: 20,
    sizelegendsizesNetwork: [15, 10, 0],
    sizelegendlabelPosNetwork: [0, 90, 210],
    sizelegendlabelPosResArea: [-48, 77],
    
    Location: ["","AMC","VUmc","AMC/VUmc", "other location"],
    resAreaMapping: [0,0,6,0,3,8,2,4,5,1,7,9,10,11,12],
    resAreaMappingInv: [0,9,6,4,7,8,2,10,5,11,12,13,14],
    ResearchArea: ["","","Early pregnancy","","Ovary","Pregnancy","Testis","Uterus","Embryo","Sex","Prenatal testing","Preg. complications","Preterm birth","Neonate","Follow-up"],
    ResearchAreaSorted: ["Sex","Testis","Ovary","Uterus","Embryo","Early pregnancy","Prenatal testing","Pregnancy","Preg. complications","Preterm birth","Neonate","Follow-up"],
    ResearchType: ["Biology","Clinical","Psychology","Biology - Clinical","Biology - Psychology","Clinical - Psychology","Biology - Clinical - Psychology"],
    sizeLegendtextResArea: ["(Co-)promotor", "PhD student"],
    sizeLegendtextNetwork: ["(Co-)promotor of more", "or fewer", "PhD students"],
    
    allData: [],    
    curLinksData: [],
    curNodesData: [],
    headerPositions: [],

    force: d3.layout.force(),    
    
    vis: null,
    link: null,
    node: null,
    forceG: null,
    linksG: null,
    nodesG: null,
    nodesMap: null,
    linkedByIndex: {},
    header: null,
    headersG: null,
    legendG: null,
    sizelegendG: null,
    researchSelection: 0,
    PISelection: 0,
    
initialize: function(data) {
    
    Network.allData = setupData(data);
    
    Network.vis = d3.select("#viscanvas").append("svg").attr("width", Network.width).attr("height", Network.height);
    Network.vis.style("opacity", 1e-6).transition().duration(1000).style("opacity",1);
    Network.forceG = Network.vis.append("g").attr("id", "forceviz").attr("transform", "translate(" + Network.networktranslation + ", 0)");
    Network.force.size([Network.networkXcenter * (Network.width - Network.networktranslation), Network.height]);
    Network.linksG = Network.forceG.append("g").attr("id", "links");
    Network.nodesG = Network.forceG.append("g").attr("id", "nodes");
    Network.headersG = Network.forceG.append("g").attr("id", "headers");
    Network.legendG = Network.vis.append("g").attr("id", "legend").attr("transform", "translate(" + Network.legenddX + "," + Network.legenddY + ")");
    Network.sizelegendG = Network.vis.append("g").attr("id", "sizelegend").attr("transform", "translate(" + Network.sizelegenddX + "," + Network.sizelegenddY + ")");
    
    UILib.setLayout("PInetwork");
    
    return Network.update();
       
    function setupData (networkdata) {
        var PhDData,linksDatadoubles=[],linksData = [],numberOfLinks,networkdatacombined,
            countExtent = d3.extent(networkdata, function(d) {if (d.PI == 1) return d.PhDNo;}),
            networkCircleRadius = d3.scale.sqrt().range([Network.networkCircleRadius.min,Network.networkCircleRadius.max]).domain(countExtent),
            resAreaPIcount = [],resAreaPhDcount = [], firstPhDpos = [], inFirstPhDrow = [],
            halfAreas = Math.ceil(Network.numberofAreas/2),
            maxID = d3.max(networkdata, function(d) {return d.PersID;}),
            copyID = maxID;
        
            networkdata.forEach(function(n) {
                if (n.PI == 0){
                    n.ResAreas = n.ResAreasPhD;
                    n.ResTypes = n.ResTypesPhD;
                } else {
                    n.ResAreas = n.ResAreasPI;
                    n.ResTypes = n.ResTypesPI;
                }
                                
                var resTypestext = "",
                    resAreastext = "",
                    locationText = "",
                    promotorText1 = null,
                    promotorText2 = null;
                                
                for (var k = 0; k < n.ResTypes.length; k += 1) {
                    var resType = n.ResTypes[k];
                                
                    if (k == 0) {
                        if(resType != 0 && resType < 4){
                                resTypestext = Network.ResearchType[resType-1];
                        } else {
                                resTypestext = "not known";
                        }
                    } else {
                        resTypestext = resTypestext + ", " + Network.ResearchType[resType-1];
                    }
                };
                                
                for (var k = 0; k < n.ResAreas.length; k += 1) {
                    var resArea = n.ResAreas[k];
                    if (k == 0) {
                        if (resArea != 0 && resArea <= Network.maxResAreaID) {
                            resAreastext = Network.ResearchArea[resArea];
                        } else {
                            resAreastext = "not known";
                        }
                    } else {
                            resAreastext = resAreastext + ", " + Network.ResearchArea[resArea];
                    }
                };
                                
                for (var k = 0; k < n.Location.length; k += 1) {
                    var location = n.Location[k];
                                
                    if (k == 0) {
                        if(location != 0 && location < 4){
                            if (location == 3){
                                locationText = Network.Location[4];
                            } else {
                                locationText = Network.Location[location];
                            };
                            } else {
                                locationText = "location not known";
                            }
                    } else {
                            locationText = locationText + " / " + Network.Location[location];
                    }
                };
                    
                if (n.PI == 0){
                    for (var k = 0; k < n.Promotors.length; k += 1) {
                                var excerpt = networkdata.filter(function(p) {return p.PersID == n.Promotors[k];});
                                if (excerpt.length > 0) {
                                    var prom = excerpt[0].PersInitials + " " + excerpt[0].PersName;
                                } else {
                                    var prom = null;
                                }
                                
                            if (k == 0) {
                                if (prom) {
                                    promotorText1 = prom;
                                }
                            } else {
                                promotorText1 = promotorText1 + ", " + prom;
                            }
                    };
                    for (var k = 0; k < n.CoPromotors.length; k += 1) {
                                var excerpt = networkdata.filter(function(p) {return p.PersID == n.CoPromotors[k];});
                                if (excerpt.length > 0) {
                                var prom = excerpt[0].PersInitials + " " + excerpt[0].PersName;
                                } else {
                                var prom = null;
                                }
                            if (k == 0) {
                                if (prom) {
                                    promotorText2 = prom;
                                }
                            } else {
                                promotorText2 = promotorText2 + ", " + prom;
                            }
                    };
                }
                                
                n.resTypestext = resTypestext;
                n.resAreastext = resAreastext;
                n.locationText = locationText;
                n.promotorText = promotorText1;
                n.copromotorText = promotorText2;
                                
            });
        
            PhDData = networkdata.filter(function(d) {return d.PI == 0;});
        
            PhDData.forEach(function(p) {
                var promotors = p.Promotors,
                copromotors = p.CoPromotors,
                allPromotors = promotors.concat(copromotors),
                numberofPromotors = allPromotors.length;

                for (var k = 0; k < numberofPromotors; k += 1){
                    for (var l = k+1; l < numberofPromotors; l += 1){
                        var source = allPromotors[k],
                            target = allPromotors[l];
                        if(source != 0 && target != 0){
                        linksDatadoubles.push({"source": source, "target": target});
                        }
                    }
                };
            });
            
            numberOfLinks = linksDatadoubles.length;
        
            for (var k = 0; k < numberOfLinks; k += 1){
                var identical = false;
                   for (var l = k+1; l < numberOfLinks; l += 1){
                       if ((linksDatadoubles[k].source == linksDatadoubles[l].source || linksDatadoubles[k].source == linksDatadoubles[l].target) && (linksDatadoubles[k].target == linksDatadoubles[l].source || linksDatadoubles[k].target == linksDatadoubles[l].target)) {
                           identical = true;
                           break;                      
                       }
                   }
                if (!identical) {linksData.push(linksDatadoubles[k])};
                
            };
        
            networkdatacombined = {"links": linksData, "nodes": networkdata};
  
        for (var n = 0; n < Network.numberofAreas; n += 1) {
            resAreaPIcount[n] = 0;
            resAreaPhDcount[n] = 0;
        };
    
        networkdatacombined.nodes.forEach(function(n) {
            n.ResAreaSelect = n.ResAreas[0];
        });

        var networkdatadoubles = networkdatacombined,
            dataindex = networkdatacombined.nodes.length;

        networkdatacombined.nodes.forEach(function(n) {
                
            if (n.PI == 1) {
                if (n.ResAreaSelect != 0 && n.ResAreaSelect <= Network.maxResAreaID){
                    var areaNumber = Network.resAreaMapping[n.ResAreaSelect];
                    resAreaPIcount[areaNumber-1] += 1;
                }
            }
                                  
            if (n.ResAreas.length > 1) {
                                          
              for (var i = 1; i < n.ResAreas.length; i += 1) { 
                if (n.PI == 1 && (n.ResAreas[i] != 0 && n.ResAreas[i] <= Network.maxResAreaID)) {
                    var areaNumber = Network.resAreaMapping[n.ResAreas[i]];
                        resAreaPIcount[areaNumber-1] += 1;
                };
                                  
                copyID += 1;
                                  
                var nodeCopy = {
                                  "PersID": copyID,
                                  "PersIDoriginal": n.PersID,
                                  "PersName": n.PersName,
                                  "PersInitials": n.PersInitials,
                                  "PI": n.PI,
                                  "Location": n.Location,
                                  "ResAreas": n.ResAreas,
                                  "ResAreasPhD": n.ResAreasPhD,
                                  "ResAreaSelect": n.ResAreas[i],
                                  "ResAreasPI": n.ResAreasPI,
                                  "ResTypes": n.ResTypes,
                                  "ResTypesPhD": n.ResTypesPhD,
                                  "ResTypesPI": n.ResTypesPI,
                                  "PhDids" : n.PhDids,
                                  "PhDNo": n.PhDNo,
                                  "Department": n.Department,
                                  "Email": n.Email,
                                  "Promotors": n.Promotors,
                                  "CoPromotors": n.CoPromotors,
                                  "resTypestext": n.resTypestext,
                                  "resAreastext": n.resAreastext,
                                  "locationText": n.locationText,
                };
                  
                networkdatadoubles.nodes[dataindex] = nodeCopy;
                dataindex += 1;
            };
              
        };                              
            return networkdatadoubles;
        });
                
                
        for (var j = 0; j < Network.numberofAreas; j += 1) {
            inFirstPhDrow[j] = (resAreaPIcount[j]%Network.inRow);
            var firstPhDx = inFirstPhDrow[j]*Network.rowdX,
                firstPhDy = (Math.floor(resAreaPIcount[j]/Network.inRow))*Network.rowdY;
                resAreaPIcount[j] = 0;
                firstPhDpos[j] = {"x": firstPhDx, "y": firstPhDy};
            var areaNumber = j + 1;            
            if (areaNumber <= halfAreas){
                Network.headerPositions[j] = {"x": areaNumber*(Network.width/(halfAreas+1)) + Network.xShiftStacks, "y": Network.height/Network.firstrowYFactor};
            } else {
                Network.headerPositions[j] = {"x": (areaNumber-halfAreas)*(Network.width/(halfAreas+1)) + Network.xShiftStacks, "y": Network.height/Network.secondrowYFactor};
            };
        };
 
        networkdatadoubles.nodes.forEach(function(n) {
                var randomnumber, xStart, yStart, areaNumber, areaIndex;
                                         
                n.x = randomnumber = Math.floor(Math.random() * Network.networkXcenter * (Network.width - Network.networktranslation));
                n.y = randomnumber = Math.floor(Math.random() * Network.height);
                    
                if (n.ResAreaSelect != 0 && n.ResAreaSelect <= Network.maxResAreaID){
                                         
                    areaNumber = Network.resAreaMapping[n.ResAreaSelect];
                    areaIndex = areaNumber - 1;
                if (areaNumber <= halfAreas){
                    xStart = areaNumber*(Network.width/(halfAreas+1)) + Network.xShiftStacks;
                    yStart = Network.height/Network.firstrowYFactor;
                } else {
                    xStart = (areaNumber-halfAreas)*(Network.width/(halfAreas+1)) + Network.xShiftStacks;
                    yStart = Network.height/Network.secondrowYFactor;
                };
                 
                if (n.PI == 1) {
                    n.xtarget = xStart + (resAreaPIcount[areaIndex]%Network.inRow)*Network.rowdX;
                    n.ytarget = yStart + (Math.floor(resAreaPIcount[areaIndex]/Network.inRow))*Network.rowdY;
                    resAreaPIcount[areaIndex] += 1;
                                         
                    n.vizradius = 2;
                    n.radius = networkCircleRadius(n.PhDNo);
                    return n.resarearadius = Network.resAreaCircleRadius[0];
                } else {
                    var firstPhDrow = Network.inRow - inFirstPhDrow[areaIndex];
                    if ((resAreaPhDcount[areaIndex]+1) <= firstPhDrow) {
                        n.xtarget = xStart + firstPhDpos[areaIndex].x + resAreaPhDcount[areaIndex]*Network.rowdX;
                        n.ytarget = yStart + firstPhDpos[areaIndex].y;
                        resAreaPhDcount[areaIndex] += 1;               
                    } else {
                        n.xtarget = xStart + ((resAreaPhDcount[areaIndex]-firstPhDrow)%Network.inRow)*Network.rowdX;
                        n.ytarget = yStart + firstPhDpos[areaIndex].y + Network.rowdY + (Math.floor((resAreaPhDcount[areaIndex]-firstPhDrow)/Network.inRow))*Network.rowdY;
                        resAreaPhDcount[areaIndex] += 1;
                    }
                                         
                    n.vizradius = Network.resAreaCircleRadius[1];
                    n.radius = Network.resAreaCircleRadius[1];
                    return n.resarearadius = Network.resAreaCircleRadius[1];
                }
            }

        });    
        
        Network.nodesMap = Network.mapNodes(networkdatadoubles.nodes);
        
        networkdatacombined.links.forEach(function(l) {
            l.source = Network.nodesMap.get(l.source);
            l.target = Network.nodesMap.get(l.target);
            return Network.linkedByIndex["" + l.source.PersID + "," + l.target.PersID] = 1;
        });
        
        return networkdatadoubles;
    }; // end setupData
   
}, // end Network.initialize

update: function() {
    
    if (Network.layout === "researchAreaGrouped") {
        
        Network.allData.nodes.forEach(function(n) {
            if (n.PI == 1 && n.ResAreaSelect != n.ResAreas[0] && n.ResAreaSelect != 0) {
                var nodeInfo = Network.nodesMap.get(n.PersIDoriginal);
                n.x = nodeInfo.x;
                n.y = nodeInfo.y;
                n.px = nodeInfo.px;
                n.py = nodeInfo.py;
                                      
                n.radius = nodeInfo.radius;
                n.vizradius = nodeInfo.vizradius;
                n.resarearadius = nodeInfo.resarearadius;
                                      
                n.searched = nodeInfo.searched;
                n.selected = nodeInfo.selected;
                                      
            } else if (n.PI == 0) {
                var randomnumber;
                    
                n.x = randomnumber = Math.floor(Math.random() * 0.2 * Network.networkXcenter * (Network.width - Network.networktranslation)) + (1.0 - 0.2 * Network.networkXcenter) * (Network.width - Network.networktranslation);
                n.y = randomnumber = Math.floor(Math.random() * Network.height);
                n.px = n.x;
                n.py = n.y;
                         
                n.radius = Network.resAreaCircleRadius[1];                      
                n.vizradius = Network.resAreaCircleRadius[1];
                n.resarearadius = Network.resAreaCircleRadius[1];
                                      
            }
        }); 
    }
    
    Network.curNodesData = filterNodes(Network.allData.nodes);
    Network.curLinksData = filterLinks(Network.allData.links, Network.curNodesData);

    Network.force.nodes(Network.curNodesData);
    Network.updateNodes();
        
    if (Network.layout === "PInetwork") {
        Network.force.links(Network.curLinksData);
        Network.updateLinks();
    } else {
        Network.force.links([]);
        if (Network.link) {
            Network.link.data([]).exit().remove();
            Network.link = null;
        }
    }
    
    Network.updateLegend();
    return Network.force.start();
    
    function filterNodes (allNodes) {
        var filteredNodes;
        
        if (Network.layout === "PInetwork") {
            filteredNodes = allNodes.filter(function(n) {return n.PI == 1 && n.ResAreaSelect == n.ResAreas[0] && n.ResAreaSelect != 0 && n.ResAreaSelect <= Network.maxResAreaID;});
        } else {
            filteredNodes = allNodes.filter(function(n) {return n.ResAreaSelect != 0 && n.ResAreaSelect <= Network.maxResAreaID;});
        }
        
        return filteredNodes;
    }; //end filterNodes
    
    function filterLinks (allLinks, curNodes) {
        curNodes = Network.mapNodes(curNodes);
        return allLinks.filter(function(l) {return curNodes.get(l.source.PersID) && curNodes.get(l.target.PersID);});
    }; //end filterLinks
 
}, // end Network.update

updateNodes: function() {
    
        Network.node = Network.nodesG.selectAll("circle.node").data(Network.curNodesData, function(d) {return d.PersID;});
        
        Network.node.enter().append("circle").attr("class", "node")
        .attr("cx", function(d) {return d.x;})
        .attr("cy", function(d) {return d.y;})
        .attr("r", function(d) {return d.radius;})
        .call(Network.force.drag);
        
        Network.updateNodestyle();
        
        Network.node.on("mouseover", showDetails).on("mouseout", hideDetails);
        
        Network.node.each(function(n) {
                          var element = d3.select(this);
                          if (n.PI == 0){
                          return element.style("opacity", 1e-6).transition().duration(1500).style("opacity",1)
                          }
                          });
        
        Network.node.exit().remove();
    
    function showDetails (d, i) {
        
        if (d.PI == 1) {
            
            var content = '<p class="main">' + d.PersName + " " + d.PersInitials + " - " + d.locationText + '</span></p>';
            content += '<p class="subinfo">' + "(Co-)promotor of " + d.PhDNo + " PhD students" + '</span></p>';
            if (d.Email != ""){
                content += '<p class="subinfo">' + "Email: " + d.Email + '</span></p>';
            };
            if (d.Department != ""){
                content += '<p class="subinfo"><b>' + "Department: " + '</b>' + d.Department + '</span></p>';
            };
            content += '<p class="subinfo"><b>' + "Research type: " + '</b>' + d.resTypestext + '</span></p>';
            content += '<p class="subinfo"><b>' + "Research themes: " + '</b>' + d.resAreastext + '</span></p>';
        } else {
            var content = '<p class="main">' + " PhD student: " + d.PersName + " " + d.PersInitials + " - " + d.locationText + '</span></p>';
            if (d.Email != ""){
                content += '<p class="subinfo">' + "Email: " + d.Email + '</span></p>';
            };
            if (d.promotorText) {
                content += '<p class="subinfo">' + "Promotors: " + d.promotorText + '</span></p>'
            }
            if (d.copromotorText) {
                content += '<p class="subinfo">' + "Co-promotors: " + d.copromotorText + '</span></p>'
            }
            if (d.Department != ""){
                content += '<p class="subinfo"><b>' + "Department: " + '</b>' + d.Department + '</span></p>';
            };
            content += '<p class="subinfo"><b>' + "Research type: " + '</b>' + d.resTypestext + '</span></p>';
            content += '<p class="subinfo"><b>' + "Research themes: " + '</b>' + d.resAreastext + '</span></p>';
        }
        
        if (Network.researchSelection == 0 && Network.layout == "PInetwork") {
            
            if (Network.link) {
                Network.link.style("stroke", function(l) {if (l.source === d || l.target === d) {return Network.linkProp.strokecolorhi;} else {return Network.linkProp.strokecolor;}}).style("stroke-width", function(l) {if (l.source === d || l.target === d) {return Network.linkProp.strokewidthhi;} else {return Network.linkProp.strokewidth;}}).style("stroke-opacity", function(l) {if (l.source === d || l.target === d) {return Network.linkProp.strokeopacityhi;} else {return Network.linkProp.strokeopacitylo;}});
            };
            
            Network.node.style("stroke", function(n) {if (neighboring(d, n)) {return Network.nodeProp.strokecolorhi;} else if (n.searched) {return Network.nodeProp.strokecolorsearched;} else {return Network.strokeFor(n);}})
            .style("stroke-width", function(n) {if (n.searched || neighboring(d, n)) {return Network.nodeProp.strokewidthhi;} else {return Network.nodeProp.strokewidth;}});
        }
        
        else if (Network.layout == "researchAreaGrouped") {
            if (Network.researchSelection == 0) {
                if(d.PI == 1){
                    if (d.PhDids[0] != 0) {
                        Network.node.style("stroke-width",function(n){if
                                     (n.PI == 0 && (d.PhDids.indexOf(n.PersID) != -1 || d.PhDids.indexOf(n.PersIDoriginal) != -1 ||(Network.PISelection > 0  && (n.Promotors.indexOf(Network.PISelection) != -1 || n.CoPromotors.indexOf(Network.PISelection) != -1)))) {return Network.nodeProp.strokewidthhi} else {return Network.nodeProp.strokewidth}}).style("stroke",function(n){if
                         (n.PI == 0 && (d.PhDids.indexOf(n.PersID) != -1 || d.PhDids.indexOf(n.PersIDoriginal) != -1 ||(Network.PISelection > 0  && (n.Promotors.indexOf(Network.PISelection) != -1 || n.CoPromotors.indexOf(Network.PISelection) != -1)))) {return Network.nodeProp.strokecolorsearched} else {return Network.strokeFor(n)}})
                    }
                } else {
                    if(d.Promotors[0] != 0 || d.CoPromotors[0] != 0){
                        Network.node
                        .style("stroke-width",function(n){if
                            (n.PI == 1 && (n.PersID == Network.PISelection || n.PersIDoriginal == Network.PISelection || d.Promotors.indexOf(n.PersID) != -1 || d.CoPromotors.indexOf(n.PersID) != -1 || d.Promotors.indexOf(n.PersIDoriginal) != -1 || d.CoPromotors.indexOf(n.PersIDoriginal) != -1)
                             ){return Network.nodeProp.strokewidthhi} else {return Network.nodeProp.strokewidth}}).style("stroke",function(n){if                                                                                                                                                                                                                                           (n.PI == 1 && (n.PersID == Network.PISelection || n.PersIDoriginal == Network.PISelection || d.Promotors.indexOf(n.PersID) != -1 || d.CoPromotors.indexOf(n.PersID) != -1 || d.Promotors.indexOf(n.PersIDoriginal) != -1 || d.CoPromotors.indexOf(n.PersIDoriginal) != -1)){return Network.nodeProp.strokecolorsearched} else {return Network.strokeFor(n)}})
                    }
                }
            }
        }
  
        if (Network.researchSelection == 0 || (Network.layout == "PInetwork" && d.selected)|| (Network.layout == "researchAreaGrouped" && d.ResAreaSelect == Network.researchSelection)) {
            Network.tooltip.showTooltip(content, d3.event);
            d3.select(this).style("stroke", Network.nodeProp.strokecolorsearched).style("stroke-width", Network.nodeProp.strokewidthhi);
        };
        
    }; //end showDetails
    
    function hideDetails (d, i) {
        
        if (Network.researchSelection == 0 || d.selected) {
            Network.tooltip.hideTooltip();
            Network.updateLinkstyle();
            Network.updateNodestyle();
            
        };
    }; //end hideDetails
    
    function neighboring (a, b) {
        return Network.linkedByIndex[a.PersID + "," + b.PersID] || Network.linkedByIndex[b.PersID + "," + a.PersID];
    }; //end neighboring
    
    
}, //end Network.updateNodes
    
updateLinks: function() {
    
    Network.link = Network.linksG.selectAll("line.link").data(Network.curLinksData, function(d) {return "" + d.source.PersID + "_" + d.target.PersID;});
    
    //Network.curLinksData.forEach(function (d){console.log(d.source.PersID.toString() + " ; " + d.target.PersID.toString());})
    
    Network.link.enter().append("line").attr("class", "link")
        .attr("x1", function(d) {return d.source.x;})
        .attr("y1", function(d) {return d.source.y;})
        .attr("x2", function(d) {return d.target.x;})
        .attr("y2", function(d) {return d.target.y;});
    
    Network.updateLinkstyle();
    
    Network.link.on("mouseover", showLinkDetails).on("mouseout", hideLinkDetails);
    
    return Network.link.exit().remove();
    
    function showLinkDetails (d, i) {

        var content = '<p class="main">' + d.source.PersName + " " + d.source.PersInitials + " (" + d.source.locationText + ")" + '</span></p>';
        if (d.source.Department != ""){
        content += '<p class="subinfo">' + "Department: " + d.source.Department + '</span></p>';
        }
        content += '<p class="main">' + " - " + '</span></p>';
        content += '<p class="main">' + d.target.PersName + " " + d.target.PersInitials + " (" + d.target.locationText + ")" + '</span></p>';
        if (d.target.Department != ""){
        content += '<p class="subinfo">' + "Department: " + d.target.Department + '</span></p>';
        }
        
        if (Network.researchSelection == 0) {
            Network.tooltip2.showTooltip(content, d3.event);
            
            Network.node.style("stroke", function(n) {if (n.PersID === d.source.PersID || n.PersID === d.target.PersID) {return Network.nodeProp.strokecolorhi;} else if (n.searched) {return Network.nodeProp.strokecolorsearched;} else {return Network.strokeFor(n);}}).style("stroke-width", function(n) {if (n.searched || n.PersID === d.source.PersID || n.PersID === d.target.PersID) {return Network.nodeProp.strokewidthhi;} else {return Network.nodeProp.strokewidth;}});
            
            d3.select(this).style("stroke", Network.linkProp.strokecolorhi).style("stroke-opacity", Network.linkProp.strokeopacityhi).style("stroke-width", Network.linkProp.strokewidthhi);
        }
        
        if (Network.researchSelection > 0 && d.source.selected && d.target.selected) {
            Network.tooltip2.showTooltip(content, d3.event);
            
            Network.node.style("stroke", function(n) {if ((n.PersID === d.source.PersID || n.PersID === d.target.PersID) && n.selected) {return Network.nodeProp.strokecolorhi;} else if (n.searched) {return Network.nodeProp.strokecolorsearched;} else if (n.selected) {return Network.nodeProp.strokecolorselected;} else if (Network.colorfilter == "affiliation") {return Network.nodeProp.strokecolornotselectedaffiliation;} else {return Network.nodeProp.strokecolornotselectedrestype;}}).style("stroke-width", function(n) {if (n.searched || ((n.PersID === d.source.PersID || n.PersID === d.target.PersID) && n.selected)) {return Network.nodeProp.strokewidthhi;} else if (n.selected) {return Network.nodeProp.strokewidthselected;} else {return Network.nodeProp.strokewidth;}});
            
            d3.select(this).style("stroke", Network.linkProp.strokecolorhi).style("stroke-opacity", Network.linkProp.strokeopacityhi).style("stroke-width", Network.linkProp.strokewidthhi);
        }
        
    }; // end showLinkDetails
    
    function hideLinkDetails (d, i) {
        if (Network.researchSelection == 0 || (d.source.selected && d.target.selected)) {
            Network.tooltip2.hideTooltip();
            Network.updateLinkstyle();
            Network.updateNodestyle();
        }

    }; // end hideLinkDetails
    
}, // end Network.updateLinks
    
mapNodes: function(nodes) {
        var nodeMap = d3.map();
        nodes.forEach(function(n) {return nodeMap.set(n.PersID, n);});
        return nodeMap;
}, // end Network.mapNodes

networkTick: function(e) {
    Network.node.each(adjustSize(e.alpha));
    
    Network.node.attr("cx", function(d) {return d.x;})
        .attr("cy", function(d) {return d.y;})
        .attr("r", function(d) {return d.vizradius;});
    
    Network.link.attr("x1", function(d) {return d.source.x;})
        .attr("y1", function(d) {return d.source.y;})
        .attr("x2", function(d) {return d.target.x;})
        .attr("y2", function(d) {return d.target.y;});
    
    function adjustSize (alpha) {
        return function(d) {return d.vizradius += (d.radius - d.vizradius) * alpha * 0.5;};
    };
    
}, // end Network.networkTick
    
groupTick: function(e) {
    Network.node.each(movetoGroupLayout(e.alpha));
    
    Network.node.attr("cx", function(d) {return d.x;})
        .attr("cy", function(d) {return d.y;})
        .attr("r", function(d) {return d.vizradius;});
    
    function movetoGroupLayout (alpha) {
        var k = alpha * 0.05;
        return function(d) {
            d.x += (d.xtarget - d.x) * k;
            d.y += (d.ytarget - d.y) * k;
            return d.vizradius -= (d.vizradius - d.resarearadius) * alpha * 0.5;
        };
    };
}, // end Network.groupTick

updateNodestyle: function() {
    return Network.node.each(function(d) {
        var element = d3.select(this);
            
        if (Network.layout == "PInetwork") {
                             
        if (!d.selected) {
            if (d.searched) {
                return element.style("fill", Network.nodeProp.fillcolorsearched).style("stroke-width", Network.nodeProp.strokewidthhi).style("stroke", Network.nodeProp.strokecolorsearched);
            } else {
                if (Network.researchSelection > 0) {
                             return element.style("fill", function(d) {if (Network.colorfilter == "affiliation"){return Network.nodeProp.fillcolorsaffiliation[4];} else {return Network.nodeProp.fillcolorsrestype[7];}}).style("stroke-width", Network.nodeProp.strokewidth).style("stroke", function(d) {if (Network.colorfilter == "affiliation"){return Network.nodeProp.strokecolornotselectedaffiliation;} else {return Network.nodeProp.strokecolornotselectedrestype;}});
                } else {
                    return element.style("fill", function(d) {if (Network.colorfilter == "affiliation"){return Network.nodeColorsaffiliation(d)} else {return Network.nodeColorsrestype(d)};}).style("stroke-width", Network.nodeProp.strokewidth).style("stroke", function(d) {return Network.strokeFor(d);});
                }
            }
        } else {
            if (d.searched){
                return element.style("fill", Network.nodeProp.fillcolorsearched).style("stroke-width", Network.nodeProp.strokewidthhi).style("stroke", Network.nodeProp.strokecolorsearched);
            } else {
                return element.style("fill", function(d) {if (Network.colorfilter == "affiliation"){return Network.nodeColorsaffiliation(d)} else {return Network.nodeColorsrestype(d)};}).style("stroke-width", Network.nodeProp.strokewidthselected).style("stroke", Network.nodeProp.strokecolorselected);
            }
        };
        } else {
            if (Network.researchSelection > 0) {
                if (d.ResAreaSelect == Network.researchSelection){
                             return element.style("fill", function(d) {if(d.searched){return Network.nodeProp.fillcolorsearched} else if (Network.colorfilter == "affiliation"){return Network.nodeColorsaffiliation(d)} else {return Network.nodeColorsrestype(d)};}).style("stroke-width", function(d)
                                                                                                                                                                                                                                                                            {if(d.searched || (d.PI == 0 && Network.PISelection > 0 && (d.Promotors.indexOf(Network.PISelection) != -1 || d.CoPromotors.indexOf(Network.PISelection) != -1))){return Network.nodeProp.strokewidthhi} else {return Network.nodeProp.strokewidthselected}}).style("stroke", function(d) {if(d.searched || (d.PI == 0 && Network.PISelection > 0 && ((d.Promotors.indexOf(Network.PISelection) != -1 && d.Promotors[d.Promotors.indexOf(Network.PISelection)] != 0) || (d.CoPromotors.indexOf(Network.PISelection) != -1 && d.CoPromotors[d.CoPromotors.indexOf(Network.PISelection)] != 0)))){return Network.nodeProp.strokecolorsearched} else {return Network.nodeProp.strokecolorselected}});
                } else {
                    return element.style("fill", function(d) {if (Network.colorfilter == "affiliation"){return Network.nodeProp.fillcolorsaffiliation[4];} else {return Network.nodeProp.fillcolorsrestype[7];}}).style("stroke-width", Network.nodeProp.strokewidth).style("stroke", function(d) {if (Network.colorfilter == "affiliation"){return Network.nodeProp.strokecolornotselectedaffiliation;} else {return Network.nodeProp.strokecolornotselectedrestype;}});
                }
            } else {
                    return element.style("fill", function(d) {if(d.searched){return Network.nodeProp.fillcolorsearched} else if (Network.colorfilter == "affiliation"){return Network.nodeColorsaffiliation(d)} else {return Network.nodeColorsrestype(d)};}).style("stroke-width", function(d) {if(d.searched || (d.PI == 0 && Network.PISelection > 0 && (d.Promotors.indexOf(Network.PISelection) != -1 || d.CoPromotors.indexOf(Network.PISelection) != -1))){return Network.nodeProp.strokewidthhi} else {return Network.nodeProp.strokewidth}}).style("stroke", function(d) {if(d.searched || (d.PI == 0 && Network.PISelection > 0 && ((d.Promotors.indexOf(Network.PISelection) != -1 && d.Promotors[d.Promotors.indexOf(Network.PISelection)] != 0) || (d.CoPromotors.indexOf(Network.PISelection) != -1 && d.CoPromotors[d.CoPromotors.indexOf(Network.PISelection)] != 0)))){return Network.nodeProp.strokecolorsearched} else {return Network.strokeFor(d);}});
            }                  
        }
    });
}, // end Network.updateNodestyle
  
updateHeaders: function(modus) {
    Network.headersG.selectAll("text.header").remove();
    Network.header = Network.headersG.selectAll("text.header").data(Network.ResearchAreaSorted);
    Network.header.enter().append("text")
    .attr("class", "header")
    .attr("x", function(d,i) {return Network.headerPositions[i].x;})
    .attr("y", function(d,i) {return Network.headerPositions[i].y;})
    .attr("dx", Network.headerdX)
    .attr("dy", Network.headerdY)
    .style("text-anchor", "start")
    .style("fill", function(d,i) {if(Network.researchSelection == 0 || Network.researchSelection == Network.resAreaMappingInv[(i+1)]){return Network.headerProp.colorselected;} else {return Network.headerProp.colornotselected;}})
    .style("opacity", function(d,i) {if(modus == 1){return 1e-6;} else {return 1;}}).transition().duration(4000).style("opacity",1)
    .style("cursor", "default")
    .text(function(d) {return d;});
}, // end Network.updateHeaders

updateLinkstyle: function() {
    if (Network.link) {
        return Network.link.each(function(d) {
            var element = d3.select(this);
            if (Network.researchSelection > 0) {
                if ( d.source.ResAreas.indexOf(Network.researchSelection) != -1 && d.target.ResAreas.indexOf(Network.researchSelection) != -1){
                     return element.style("stroke", Network.linkProp.strokecolorhi).style("stroke-opacity", Network.linkProp.strokeopacityhi).style("stroke-width", Network.linkProp.strokewidthhi);
                } else {
                    return element.style("stroke", Network.linkProp.strokecolor).style("stroke-opacity", Network.linkProp.strokeopacitylo).style("stroke-width", Network.linkProp.strokewidth);               
                }                           
            } else {
                return element.style("stroke", Network.linkProp.strokecolor).style("stroke-opacity", Network.linkProp.strokeopacity).style("stroke-width", Network.linkProp.strokewidth);
            }                    
        });    
    };
}, // end Network.updateLinkstyle                             
 
updateLegend: function() {
    var legenddata, legendcolors, legendsizes, labelpositions;
    
    if (Network.colorfilter == "affiliation") {
        legenddata = Network.Location.slice(1);
        legendcolors = Network.nodeProp.fillcolorsaffiliation;
    } else {
        legenddata = Network.ResearchType;
        legendcolors = Network.nodeProp.fillcolorsrestype;
    };
    
    Network.legendG.selectAll(".legendentry").remove();
    
    var legendentry = Network.legendG.selectAll(".legendentry")
                        .data(legenddata)
                        .enter().append("g")
                        .attr("class", "legendentry")
                        .attr("transform", function(d, i) {if (Network.colorfilter == "affiliation") {return "translate( 0, " + (i*20) + ")";} else {return "translate( 0, " + (120 - i*20) + ")";} });
    
    legendentry.append("circle")
    .attr("cx", 0)
    .attr("cy", 0)
    .attr("r", 5)
    .style("fill", function(d,i) {return legendcolors[i];})
    .style("stroke", function(d,i) {return d3.rgb(legendcolors[i]).darker().toString();})
    .style("stroke-width", Network.nodeProp.strokewidth);

    legendentry.append("text")
    .attr("x", 15)
    .attr("y", 5)
    .style("text-anchor", "start")
    .style("fill", Network.legendProp.textcolor)
    .style("cursor", "default")
    .text(function(d) {return d;});
    
    if (Network.layout == "PInetwork") {
        legenddata = Network.sizeLegendtextNetwork;
        legendsizes = Network.sizelegendsizesNetwork;
        labelpositions = Network.sizelegendlabelPosNetwork;
    } else {
        legenddata = Network.sizeLegendtextResArea;
        legendsizes = Network.resAreaCircleRadius;
        labelpositions = Network.sizelegendlabelPosResArea;
    };
    
    Network.sizelegendG.selectAll(".legendentry").remove();
    
    var legendentry = Network.sizelegendG.selectAll(".legendentry")
    .data(legenddata)
    .enter().append("g")
    .attr("class", "legendentry")
    .attr("transform", function(d, i) {return "translate(" + labelpositions[i] + ",0)"; });
    
    legendentry.append("circle")
    .attr("cx", 20)
    .attr("cy", 0)
    .attr("r", function(d, i) {return legendsizes[i]})
    .style("fill", Network.nodeProp.fillcolorsrestype[7])
    .style("stroke", d3.rgb(Network.nodeProp.fillcolorsrestype[7]).darker().toString())
    .style("stroke-width", Network.nodeProp.strokewidth);
    
    legendentry.append("text")
    .attr("x", 0)
    .attr("y", 5)
    .style("text-anchor", "end")
    .style("fill", Network.legendProp.textcolor)
    .style("cursor", "default")
    .text(function(d) {return d;});
    
}, // end Network.updateLegend
    
nodeColorsaffiliation: function(d) {

    var numberofLocations = d.Location.length;
    
    if (numberofLocations == 2){
        return Network.nodeProp.fillcolorsaffiliation[2];
    } else if (numberofLocations == 1){
        if (d.Location[0] != 0 && d.Location[0] < 4) {
            if (d.Location[0] == 3) {
                return Network.nodeProp.fillcolorsaffiliation[3];
            } else {            
                return Network.nodeProp.fillcolorsaffiliation[d.Location[0]-1];
            };
        } else {
            return Network.nodeProp.fillcolorsaffiliation[3];
      };
    };

    
}, // end Network.nodeColorsaffiliation 
    
nodeColorsrestype: function(d) {
    
    var numberofResTypes = d.ResTypes.length;
    
    if (numberofResTypes == 1) {
        if (d.ResTypes[0] != 0 && d.ResTypes[0] < 4){
        return Network.nodeProp.fillcolorsrestype[d.ResTypes[0]-1];
        } else {
            return Network.nodeProp.fillcolorsrestype[7];
        }
    } else if (numberofResTypes == 2) {
        var typeSum = d.ResTypes[0] + d.ResTypes[1];
        return Network.nodeProp.fillcolorsrestype[typeSum];
    } else if (numberofResTypes == 3) {
        return Network.nodeProp.fillcolorsrestype[6];
    }
    
}, // end Network.nodeColorsrestype
    
strokeFor: function(d) {
    
    if (Network.colorfilter == "affiliation") {
        return d3.rgb(Network.nodeColorsaffiliation(d)).darker().toString();
    } else {
        return d3.rgb(Network.nodeColorsrestype(d)).darker().toString();
    }
        
}, // end Network.strokeFor
   
nodeCharge: function(node) {
    return -Math.pow(node.radius, 2.5) / 5.2;
},
    
}; // end Network{}


var UILib = {
    
// default force settings: link strength 1, friction 0.9, distance 20, charge strength -30, gravity strength 0.1, and theta parameter 0.8
    
setLayout: function(newLayout) {
    Network.layout = newLayout;
    if (Network.layout === "PInetwork") {
        
        Network.headersG.selectAll("text.header").remove();

         return Network.force.on("tick", Network.networkTick).friction(0.85).charge(Network.nodeCharge).linkDistance(55).linkStrength(0.7).gravity(0.12).theta(0.8);

    } else if (Network.layout === "researchAreaGrouped") {
        Network.force.on("tick", Network.groupTick).friction(0.9).charge(0).linkDistance(0).linkStrength(0).gravity(0).theta(0.8);
        
        Network.updateHeaders(1);
    }
}, //end UILib.setLayout
    
toggleLayout: function(newLayout) {
    Network.force.stop();
    UILib.setLayout(newLayout);
    return Network.update();
}, //end UILib.toggleLayout
    
toggleColorFilter: function(newColorFilter) {
    Network.colorfilter = newColorFilter;
    Network.updateNodestyle();
    return Network.updateLegend();
}, //end UILib.toggleColorFilter
    
updatePISearch: function(searchValue) {
    Network.PISelection = Number(searchValue);
    
    Network.node.each(function(d) {
        var element = d3.select(this);
        if (Network.PISelection > 0 && (d.PersID == Network.PISelection || d.PersIDoriginal == Network.PISelection)) {
        return d.searched = true;
//            return d.selected = true;
        } else {
            return d.searched = false;
//            d.selected = false;
        }
    });
    
   return Network.updateNodestyle();
    
}, //end UILib.updatePISearch

updateResearchSelection: function(searchValue) {
    Network.researchSelection = Number(searchValue);
    
    if (Network.layout === "researchAreaGrouped") {
        Network.updateHeaders(2);
    }
    
    Network.node.each(function(d) {       
                      
        var element = d3.select(this);
        if (Network.researchSelection > 0 && d.ResAreas.indexOf(Network.researchSelection) != -1) {
            return d.selected = true;
        } else {
           return d.selected = false;
        }
    });
    
    if (Network.layout === "PInetwork") {
        Network.nodesG.selectAll("circle.node")
        .sort(function(a,b) {
              if (a.selected) {
                return 1;
              } else {
                return -1;
              } 
        });
        
        Network.linksG.selectAll("line.link")
        .sort(function(a,b) {
              if (a.source.selected || a.target.selected) {
                return 1;
              } else {
                return -1;
              }
        });

    };
    
    Network.updateNodestyle();
    Network.updateLinkstyle();
},  //end UILib.updateResearchSelection
    
} // end UILib{}
