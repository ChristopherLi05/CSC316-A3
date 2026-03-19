const width = "80vw", height = "80vh";
let selectedDept = null;

function updateSelectedDept(newDept) {
    if (newDept === selectedDept || newDept === "All") {
        newDept = null;
    }

    selectedDept = newDept;

    const event = new CustomEvent("changeDept", {
        detail: {selectedDept}
    });

    window.dispatchEvent(event);
}

d3.csv("data/course_evals.csv").then(d => {
    // Make CSV
    d3.select("#wrap").append("svg").attr("width", width).attr("height", height).attr("id", "bubble-chart-svg");

    // Make Bubble Chart
    renderBubbleChart(d, {
        groupBy: 'dept', svgId: "bubble-chart-svg", onClick: (label, value) => {
            console.log(label);
            updateSelectedDept(label);
        }
    });
});