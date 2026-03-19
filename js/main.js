const width = "80vw", height = "80vh";
let selectedDept = null;

function updateSelectedDept(newDept) {
    if (newDept === selectedDept || newDept === "All") {
        newDept = null;
    }

    selectedDept = newDept;

    const event = new CustomEvent("changeDept", {
        detail: { selectedDept }
    });

    window.dispatchEvent(event);
}

d3.csv("data/course_evals.csv").then(rows => {

    // --- SVGs ---
    d3.select("#wrap")
        .append("svg")
        .attr("width", width).attr("height", height)
        .attr("id", "bubble-chart-svg");

    d3.select("#hist-wrap")
        .append("svg")
        .attr("width", width).attr("height", height)
        .attr("id", "hist-chart-svg");

    // --- Bubble Chart ---
    renderBubbleChart(rows, {
        groupBy: 'dept',
        svgId: "bubble-chart-svg",
        onClick: (label) => {
            updateSelectedDept(label);
        }
    });

    // --- Histogram ---
    const hist = renderHistogram(rows, {
        svgId:  "hist-chart-svg",
        tipId:  "hist-tip",
        wrapId: "hist-wrap",
    });

    // --- Populate dept datalist ---
    const depts = Array.from(new Set(rows.map(r => r.dept))).sort();
    const datalist = document.getElementById('hist-dept-list');
    ['All', ...depts].forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        datalist.appendChild(opt);
    });

    // --- Type selector ---
    document.getElementById('hist-type-select').addEventListener('change', function () {
        hist.setType(this.value);
    });

    // --- Dept selector (free-text + datalist) ---
    // Fire on Enter or when user picks from datalist (input event + blur)
    const deptInput = document.getElementById('hist-dept-select');

    function applyDeptInput() {
        const val = deptInput.value.trim();
        const valid = val === '' || val === 'All' || depts.includes(val);
        if (valid) {
            deptInput.style.borderColor = '';
            hist.setDept(val === '' ? 'All' : val);

            // Keep bubble chart in sync
            const dept = (val === '' || val === 'All') ? null : val;
            if (dept !== selectedDept) {
                selectedDept = dept;
                window.dispatchEvent(new CustomEvent("changeDept", { detail: { selectedDept } }));
            }
        } else {
            // Highlight invalid input
            deptInput.style.borderColor = '#dc3545';
        }
    }

    deptInput.addEventListener('change',  applyDeptInput);   // datalist pick
    deptInput.addEventListener('keydown', e => { if (e.key === 'Enter') applyDeptInput(); });

    // Keep the text input in sync when the bubble chart is clicked
    window.addEventListener('changeDept', event => {
        const dept = event.detail.selectedDept;
        deptInput.value = dept ?? 'All';
        deptInput.style.borderColor = '';
    });
});