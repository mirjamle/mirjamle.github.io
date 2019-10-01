import 'nodelist-foreach-polyfill';
import * as d3 from "d3";
import * as viz from './viz.js';

document.getElementById("clusterbutton").style.display = "none"; 
document.getElementById("dragbar").style.display = "none"; 
document.getElementById("publicationscontainer").style.display = "none"; 
document.getElementById("pulledinfo").style.visibility = "hidden";

var tabbuttons = document.querySelectorAll(".tabbutton"),
    activeTab = 1;

function resetHover(){
    if(viz.currentChart == 3){
        document.getElementById("pulledinfo").innerHTML = "<p id='pointerinstruction'>hover over the field bubbles for more details</p>";
    } else {
        document.getElementById("pulledinfo").innerHTML = "<p id='pointerinstruction'>hover over the publication dots for more details</p>";
    }
    viz.hidePubDetails();
}

tabbuttons.forEach(t => {
    t.addEventListener('click',function(event){
        resetHover();
        activeTab = +event.target.id.slice(-1);
        
        if(activeTab != 5){
            document.getElementById("publicationscontainer").style.display = "none"; 
            document.getElementById("chartcontainer").style.display = "block";
            document.getElementById("slidercontainer").style.visibility = "";
            document.getElementById("filters").style.visibility = "";
            document.getElementById("credits").style.visibility = "";
            document.getElementById("pulledinfo").style.visibility = "";
            viz.swapChart(activeTab); 
        } else {   
            document.getElementById("publicationscontainer").style.display = "block"; 
            document.getElementById("chartcontainer").style.display = "none";
            document.getElementById("slidercontainer").style.visibility = "hidden";
            document.getElementById("filters").style.visibility = "hidden";
            document.getElementById("credits").style.visibility = "hidden";
            document.getElementById("pulledinfo").style.visibility = "hidden";
            document.getElementById("byline").innerHTML = "All publications sorted by research field and by year.";
        }
        
        tabbuttons.forEach(b => {
            b.classList.remove("selected");
        })
        
        if(activeTab != 4){
            event.target.classList.add("selected");
        }
    });
})

document.querySelector("#rankbutton").addEventListener('click',function(event){
    resetHover();
    viz.showYear("rank");
    event.target.style.display = "none";
    document.getElementById("clusterbutton").style.display = "";      
});

document.querySelector("#clusterbutton").addEventListener('click',function(event){
    resetHover();
    viz.showYear("all");
    event.target.style.display = "none";
    document.getElementById("rankbutton").style.display = "";          
});

let hidecover = () => {
    document.getElementById("cover").style.visibility = "hidden";
};

Promise.all([
    "data/pubs.csv",
    "data/yearstats.csv"
].map(function(url) {
  return fetch(url).then(function(response) {
    return response.ok ? response.text() : Promise.reject(response.status);
  }).then(function(text) {
    return d3.csvParse(text);
  });
})).then(function(value) {
    const   pubs = value[0],
            stats = value[1];
         
   viz.initialize(stats, pubs, hidecover);
    
    var allAuthors = [], authorList;
    pubs.forEach(d => {
        if(d.author_first != "NULL"){
            allAuthors.push(d.author_first.toUpperCase());
        }
    });
                
    authorList = allAuthors.reduce((a,b) => {
        if (a.indexOf(b) < 0 ) a.push(b);
        return a;
    },[]);
    
    let autocomplete = (inp, arr) => {
        var currentFocus, author;
        inp.addEventListener("input", function(e) {
            var a, b, i, val = this.value;
            closeAllLists();
            if (!val || val.length < 2) { return false;}
            currentFocus = -1;
            a = document.createElement("DIV");
            a.setAttribute("id", this.id + "autocomplete-list");
            a.setAttribute("class", "autocomplete-items");
            this.parentNode.appendChild(a);
            for (i = 0; i < arr.length; i++) {
                if (arr[i].substr(0, val.length).toUpperCase() == val.toUpperCase()) {
                    b = document.createElement("DIV");
                    b.innerHTML = "<strong>" + arr[i].substr(0, val.length) + "</strong>";
                    b.innerHTML += arr[i].substr(val.length);
                    b.innerHTML += "<input type='hidden' value='" + arr[i] + "'>";
                    b.addEventListener("click", function(e) {
                        author = this.getElementsByTagName("input")[0].value;
                        inp.value = author;
                        viz.searchName(author);   
                        closeAllLists();
                    });
                    a.appendChild(b);
                }
            }
        });

        inp.addEventListener("keydown", function(e) {
            var x = document.getElementById(this.id + "autocomplete-list");
            if (x) x = x.getElementsByTagName("div");
            if (e.keyCode == 40) {
                currentFocus++;
                addActive(x);
            } else if (e.keyCode == 38) {
                currentFocus--;
                addActive(x);
            } else if (e.keyCode == 13) {
                e.preventDefault();
                if (currentFocus > -1) {
                    if (x) x[currentFocus].click();
                }
            }
        });
        
        let addActive = (x) => {
                if (!x) return false;
                removeActive(x);
                if (currentFocus >= x.length) currentFocus = 0;
                if (currentFocus < 0) currentFocus = (x.length - 1);
                x[currentFocus].classList.add("autocomplete-active");
            }
        
        
        let removeActive = (x) => {
            for (let i = 0; i < x.length; i++) {
                x[i].classList.remove("autocomplete-active");
            }
        }
        
        let closeAllLists = (elmnt) => {
            var x = document.getElementsByClassName("autocomplete-items");
            for (let i = 0; i < x.length; i++) {
                if (elmnt != x[i] && elmnt != inp) {
                    x[i].parentNode.removeChild(x[i]);
                }
            }
        }
        
        document.addEventListener("click", function (e) {
            resetHover();
            closeAllLists(e.target);
        });
    }
    
    autocomplete(document.getElementById("Authorlist"), authorList);
    
    document.querySelector("#Authorlist").addEventListener("click", function (e) { 
        this.value = "";
        this.placeholder = "";
        viz.searchName("");
    });    
});