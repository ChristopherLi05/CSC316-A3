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

d3.csv("data/course_evals.csv").then(rows => {
    rows.forEach(d => {
        d.dept = d.dept.replace("-ARTSC", "");
    })

    const wrap = document.getElementById("wrap");
    const size = wrap.clientWidth;

    // --- SVGs ---
    d3.select("#wrap")
        .append("svg")
        .attr("width", "100%").attr("height", 0.8 * size)
        .attr("id", "bubble-chart-svg");

    const hist_wrap = document.getElementById("hist-wrap-1");
    const hist_wrap_size = hist_wrap.clientWidth;

    d3.select("#hist-wrap-1")
        .append("svg")
        .attr("width", hist_wrap_size).attr("height", hist_wrap_size)
        .attr("id", "hist-chart-svg-1");

    d3.select("#hist-wrap-2")
        .append("svg")
        .attr("width", hist_wrap_size).attr("height", hist_wrap_size)
        .attr("id", "hist-chart-svg-2");

    // --- Bubble Chart ---
    renderBubbleChart(rows, (label) => {
        updateSelectedDept(label);
    });

    // --- Histogram ---
    const hist1 = renderHistogram(rows, {
        wrapId: "hist-wrap-1",
        svgId: "hist-chart-svg-1",
        updateEvent: "changeDept",
    });

    const hist2 = renderHistogram(rows, {
        wrapId: "hist-wrap-2",
        svgId: "hist-chart-svg-2",
    });

    // --- Populate dept datalist ---
    const depts = Array.from(new Set(rows.map(r => r.dept))).sort();
    const datalist = document.getElementById('hist-dept-list-1');
    const datalist2 = document.getElementById('hist-dept-list-2');

    ['All', ...depts].forEach(d => {
        const opt = document.createElement('option');
        opt.value = d;
        datalist.appendChild(opt);

        const opt2 = document.createElement('option');
        opt2.value = d;
        datalist2.appendChild(opt2);
    });

    // --- Type selector ---
    document.getElementById('hist-type-select').addEventListener('change', function () {
        hist1.setType(this.value);
        hist2.setType(this.value);
    });

    // --- Dept selector (free-text + datalist) ---
    // Fire on Enter or when user picks from datalist (input event + blur)
    function applyDeptInput(inpt, hist, dispatchEvent=true) {
        const val = inpt.value.trim();
        const valid = val === '' || val === 'All' || depts.includes(val);
        if (valid) {
            inpt.style.borderColor = '';
            hist.setDept(val === '' ? 'All' : val);

            // Keep bubble chart in sync
            const dept = (val === '' || val === 'All') ? null : val;
            if (dept !== selectedDept && dispatchEvent) {
                selectedDept = dept;
                window.dispatchEvent(new CustomEvent("changeDept", {detail: {selectedDept}}));
            }
        } else {
            // Highlight invalid input
            deptInput.style.borderColor = '#dc3545';
        }
    }

    const deptInput = document.getElementById('hist-dept-select-1');
    deptInput.addEventListener('change', () => {applyDeptInput(deptInput, hist1)});   // datalist pick
    deptInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') applyDeptInput(deptInput, hist1);
    });

    const deptInput2 = document.getElementById('hist-dept-select-2');
    deptInput2.addEventListener('change', () => {applyDeptInput(deptInput2, hist2, false)});   // datalist pick
    deptInput2.addEventListener('keydown', e => {
        if (e.key === 'Enter') applyDeptInput(deptInput2, hist2, false);
    });


    // Keep the text input in sync when the bubble chart is clicked
    window.addEventListener('changeDept', event => {
        const dept = event.detail.selectedDept;
        deptInput.value = dept ?? 'All';
        deptInput.style.borderColor = '';
    });
});