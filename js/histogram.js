// renderHistogram(rows, options)
//
// rows       — array of objects from d3.csv()
// options:
//   valueCol  {string}    numeric column to plot               (default: 'Avg')
//   wrapId    {string}    id of container div                  (default: 'hist-wrap')
//   svgId     {string}    id of <svg> element                  (default: 'hist-chart-svg')
//   tipId     {string}    id of tooltip div                    (default: 'hist-tip')
//   maxBins   {number}    maximum number of bins               (default: 30)
//   onTypeChange   {function}  called with (typeValue) when type selector changes
//   onDeptChange   {function}  called with (deptValue) when dept selector changes

function renderHistogram(rows, {
    valueCol      = 'Avg',
    wrapId        = 'hist-wrap',
    svgId         = 'hist-chart-svg',
    tipId         = 'hist-tip',
    maxBins       = 30,
} = {}) {
    const MARGIN = { top: 40, right: 50, bottom: 70, left: 70 };
    const ANIM_MS = 500;
    const BAR_COLOR        = '#3e94bd';
    const BAR_FILL         = '#e5f4ff';
    const MEAN_COLOR       = '#993C1D';
    const MEDIAN_COLOR     = '#0F6E56';

    // --- State ---
    let currentValueCol = valueCol;
    let currentDept     = null;   // null = All

    const svg  = d3.select(`#${svgId}`);
    const wrap = document.getElementById(wrapId);
    const tip  = document.getElementById(tipId);
    const tipName = tip.querySelector('[data-tip-name]');
    const tipVal  = tip.querySelector('[data-tip-val]');

    let W = svg.node().getBoundingClientRect().width;
    let H = svg.node().getBoundingClientRect().height;
    let innerW = W - MARGIN.left - MARGIN.right;
    let innerH = H - MARGIN.top  - MARGIN.bottom;

    // --- Root group ---
    const root = svg.append('g')
        .attr('class', 'hist-root')
        .attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);

    // Clip path so bars never overflow the plot area
    const clipId = `${svgId}-clip`;
    svg.append('defs').append('clipPath').attr('id', clipId)
        .append('rect')
        .attr('class', 'clip-rect')
        .attr('x', 0).attr('y', 0)
        .attr('width', innerW).attr('height', innerH);

    const barsG = root.append('g').attr('class', 'bars').attr('clip-path', `url(#${clipId})`);
    const axisGX  = root.append('g').attr('class', 'axis-x').attr('transform', `translate(0,${innerH})`);
    const axisGY  = root.append('g').attr('class', 'axis-y');
    const linesG  = root.append('g').attr('class', 'stat-lines');

    // Axis labels
    const xLabel = root.append('text')
        .attr('class', 'axis-label')
        .attr('text-anchor', 'middle')
        .attr('x', innerW / 2)
        .attr('y', innerH + 44)
        .attr('font-size', '13px')
        .attr('fill', '#555');

    root.append('text')
        .attr('class', 'axis-label-y')
        .attr('text-anchor', 'middle')
        .attr('transform', `rotate(-90)`)
        .attr('x', -innerH / 2)
        .attr('y', -42)
        .attr('font-size', '13px')
        .attr('fill', '#555')
        .text('Count');

    // Legend
    const legendG = root.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(20, 0)`);

    legendG.append('line').attr('class', 'leg-mean')
        .attr('x1', 0).attr('x2', 18).attr('y1', 8).attr('y2', 8)
        .attr('stroke', MEAN_COLOR).attr('stroke-width', 2).attr('stroke-dasharray', '5,3');
    legendG.append('text').attr('x', 22).attr('y', 12)
        .attr('font-size', '12px').attr('fill', '#444').text('Mean');

    legendG.append('line').attr('class', 'leg-median')
        .attr('x1', 0).attr('x2', 18).attr('y1', 26).attr('y2', 26)
        .attr('stroke', MEDIAN_COLOR).attr('stroke-width', 2).attr('stroke-dasharray', '2,3');
    legendG.append('text').attr('x', 22).attr('y', 30)
        .attr('font-size', '12px').attr('fill', '#444').text('Median');

    // --- Helpers ---
    function getValues(col, dept) {
        let filtered = rows;
        if (dept) filtered = rows.filter(r => r.dept === dept);

        if (col === 'Avg') {
            // Average of INS1–INS6 per row
            return filtered.map(r => {
                const vals = [1,2,3,4,5,6]
                    .map(i => +r[`INS${i}`])
                    .filter(v => !isNaN(v) && v > 0);
                return vals.length ? d3.mean(vals) : NaN;
            }).filter(v => !isNaN(v));
        } else {
            return filtered
                .map(r => +r[col])
                .filter(v => !isNaN(v) && v > 0);
        }
    }

    function niceBinCount(values, max) {
        // Sturges' rule, clamped to max
        const sturges = Math.ceil(Math.log2(values.length)) + 1;
        return Math.min(sturges, max);
    }

    // --- Draw / Update ---
    function update(col, dept, animate = true) {
        const values = getValues(col, dept);
        if (!values.length) return;

        const binCount = niceBinCount(values, maxBins);

        const xScale = d3.scaleLinear()
            .domain([0, 5])
            .range([0, innerW]);

        const binner = d3.bin()
            .domain(xScale.domain())
            .thresholds(xScale.ticks(binCount));

        const bins = binner(values);

        const yScale = d3.scaleLinear()
            .domain([0, d3.max(bins, b => b.length) * 1.1])
            .range([innerH, 0])
            .nice();

        // Axes
        const dur = animate ? ANIM_MS : 0;

        axisGX.transition().duration(dur)
            .call(d3.axisBottom(xScale).ticks(Math.min(binCount, 10)).tickSizeOuter(0));

        axisGY.transition().duration(dur)
            .call(d3.axisLeft(yScale).ticks(6).tickSizeOuter(0));

        xLabel.text((col === 'Avg' ? 'Average Score (INS1–INS6)' : `${col} Score`) + ` (${values.length})`);

        // Bars
        const bars = barsG.selectAll('rect.bar')
            .data(bins, d => d.x0);

        bars.join(
            enter => enter.append('rect')
                .attr('class', 'bar')
                .attr('x',      d => xScale(d.x0) + 1)
                .attr('width',  d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
                .attr('y',      innerH)
                .attr('height', 0)
                .attr('fill',   BAR_FILL)
                .attr('stroke', BAR_COLOR)
                .attr('stroke-width', 1)
                .attr('rx', 2)
                .on('mouseenter', function(event, d) {
                    d3.select(this).attr('fill', BAR_COLOR).attr('opacity', 0.85);
                    tipName.textContent = `${d.x0.toFixed(2)} – ${d.x1.toFixed(2)}`;
                    tipVal.textContent  = `count: ${d.length}`;
                    tip.style.opacity   = '1';
                })
                .on('mousemove', function(event) {
                    const rect = wrap.getBoundingClientRect();
                    tip.style.left = (event.clientX - rect.left + 14) + 'px';
                    tip.style.top  = (event.clientY - rect.top  - 36) + 'px';
                })
                .on('mouseleave', function() {
                    d3.select(this).attr('fill', BAR_FILL).attr('opacity', 1);
                    tip.style.opacity = '0';
                })
                .call(e => e.transition().duration(dur)
                    .attr('y',      d => yScale(d.length))
                    .attr('height', d => innerH - yScale(d.length))
                ),
            update => update
                .call(u => u.transition().duration(dur)
                    .attr('x',      d => xScale(d.x0) + 1)
                    .attr('width',  d => Math.max(0, xScale(d.x1) - xScale(d.x0) - 2))
                    .attr('y',      d => yScale(d.length))
                    .attr('height', d => innerH - yScale(d.length))
                ),
            exit => exit
                .call(e => e.transition().duration(dur)
                    .attr('y',      innerH)
                    .attr('height', 0)
                    .remove()
                )
        );

        // Mean & Median lines
        const mean   = d3.mean(values);
        const median = d3.median(values);

        const statData = [
            { id: 'mean',   val: mean,   color: MEAN_COLOR,   dash: '5,3', labelY: 12 },
            { id: 'median', val: median, color: MEDIAN_COLOR, dash: '2,3', labelY: 26 },
        ];

        linesG.selectAll('line.stat-line')
            .data(statData, d => d.id)
            .join(
                enter => enter.append('line')
                    .attr('class', 'stat-line')
                    .attr('x1', d => xScale(d.val))
                    .attr('x2', d => xScale(d.val))
                    .attr('y1', 0).attr('y2', innerH)
                    .attr('stroke', d => d.color)
                    .attr('stroke-width', 2)
                    .attr('stroke-dasharray', d => d.dash)
                    .attr('opacity', 0)
                    .call(e => e.transition().duration(dur).attr('opacity', 1)),
                update => update
                    .call(u => u.transition().duration(dur)
                        .attr('x1', d => xScale(d.val))
                        .attr('x2', d => xScale(d.val))
                        .attr('opacity', 1)
                    ),
                exit => exit.transition().duration(dur).attr('opacity', 0).remove()
            );

        // Stat labels
        linesG.selectAll('text.stat-label')
            .data(statData, d => d.id)
            .join(
                enter => enter.append('text')
                    .attr('class', 'stat-label')
                    .attr('x', d => xScale(d.val) + 4)
                    .attr('y', d => d.labelY)
                    .attr('font-size', '11px')
                    .attr('fill', d => d.color)
                    .attr('opacity', 0)
                    .text(d => `${d.id === 'mean' ? 'μ' : 'M'} ${d.val.toFixed(2)}`)
                    .call(e => e.transition().duration(dur).attr('opacity', 1)),
                update => update
                    .call(u => u.transition().duration(dur)
                        .attr('x', d => xScale(d.val) + 4)
                        .attr('opacity', 1)
                        .text(d => `${d.id === 'mean' ? 'μ' : 'M'} ${d.val.toFixed(2)}`)
                    ),
                exit => exit.transition().duration(dur).attr('opacity', 0).remove()
            );
    }

    // --- changeDept event (from bubble chart clicks) ---
    window.addEventListener('changeDept', event => {
        const dept = event.detail.selectedDept;
        currentDept = dept;

        // Sync the dept dropdown if it exists
        const deptSel = document.getElementById('hist-dept-select');
        if (deptSel) deptSel.value = dept ?? 'All';

        update(currentValueCol, currentDept);
    });

    // --- Public update handle ---
    // Called externally (from main.js) when selectors change
    function setType(col) {
        currentValueCol = col;
        update(currentValueCol, currentDept);
    }

    function setDept(dept) {
        currentDept = dept === 'All' ? null : dept;
        update(currentValueCol, currentDept);
    }

    // --- Resize ---
    new ResizeObserver(() => {
        W = svg.node().getBoundingClientRect().width;
        H = svg.node().getBoundingClientRect().height;
        innerW = W - MARGIN.left - MARGIN.right;
        innerH = H - MARGIN.top  - MARGIN.bottom;

        svg.select('.hist-root').attr('transform', `translate(${MARGIN.left},${MARGIN.top})`);
        svg.select('.clip-rect').attr('width', innerW).attr('height', innerH);
        axisGX.attr('transform', `translate(0,${innerH})`);
        xLabel.attr('x', innerW / 2).attr('y', innerH + 44);
        svg.select('.axis-label-y').attr('x', -innerH / 2);
        legendG.attr('transform', `translate(20, 0)`);

        update(currentValueCol, currentDept, false);
    }).observe(wrap);

    // Initial draw
    update(currentValueCol, currentDept, false);

    // Expose setters so main.js can wire up the selectors
    return { setType, setDept };
}