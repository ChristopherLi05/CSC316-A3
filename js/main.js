const width = "80vw", height = "80vh";


d3.csv("data/course_evals.csv").then(d => {
    // Make CSV
    d3.select("#wrap").append("svg").attr("width", width).attr("height", height).attr("id", "bubble-chart-svg");

    // Make Bubble Chart
    renderBubbleChart(d, {
        groupBy: 'dept', svgId: "bubble-chart-svg", onClick: (label, value) => {
            console.log(label, value);
        }
    });
});