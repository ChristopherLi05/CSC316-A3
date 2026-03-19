// renderBubbleChart(rows, options)
//
// rows      — array of objects from d3.csv()
// options:
//   groupBy  {string}    column to group bubbles by            (default: 'dept')
//   valueCol {string}    numeric column to sum for size,
//                        or omit to count rows per group       (default: count)
//   wrapId   {string}    id of container div                   (default: 'wrap')
//   svgId    {string}    id of <svg> element                   (default: 'svg')
//   tipId    {string}    id of tooltip div                     (default: 'tip')
//   minR     {number}    min bubble radius px                  (default: 28)
//   maxR     {number}    max bubble radius px                  (default: 80)
//   onClick  {function}  called with (label, value) on click   (default: null)

const PALETTE = [
    { fill: '#EEEDFE', stroke: '#534AB7', text: '#3C3489' },
    { fill: '#E1F5EE', stroke: '#0F6E56', text: '#085041' },
    { fill: '#FAECE7', stroke: '#993C1D', text: '#712B13' },
    { fill: '#FBEAF0', stroke: '#993556', text: '#72243E' },
    { fill: '#E6F1FB', stroke: '#185FA5', text: '#0C447C' },
    { fill: '#FAEEDA', stroke: '#854F0B', text: '#633806' },
    { fill: '#EAF3DE', stroke: '#3B6D11', text: '#27500A' },
    { fill: '#F1EFE8', stroke: '#5F5E5A', text: '#444441' },
];

function renderBubbleChart(rows, {
    groupBy  = 'dept',
    valueCol = null,
    wrapId   = 'wrap',
    svgId    = 'svg',
    tipId    = 'tip',
    minR     = 28,
    maxR     = 80,
    onClick  = null,
} = {}) {
    const wrap    = document.getElementById(wrapId);
    const svg     = d3.select(`#${svgId}`);
    const tip     = document.getElementById(tipId);
    const tipName = tip.querySelector('[data-tip-name]');
    const tipVal  = tip.querySelector('[data-tip-val]');

    // --- Aggregate ---
    const grouped = d3.rollup(
        rows,
        v => valueCol ? d3.sum(v, d => +d[valueCol]) : v.length,
        d => d[groupBy]
    );

    const keys     = Array.from(grouped.keys()).sort();
    const colorMap = new Map(keys.map((k, i) => [k, PALETTE[i % PALETTE.length]]));

    const rScale = d3.scaleSqrt()
        .domain([0, d3.max(grouped.values())])
        .range([minR, maxR]);

    let W = wrap.clientWidth;
    let H = wrap.clientHeight;

    const nodes = keys.map(key => ({
        label: key,
        value: grouped.get(key),
        r:     rScale(grouped.get(key)),
        color: colorMap.get(key),
    }));

    // --- Zoom & Pan ---
    const zoomG = svg.append('g').attr('class', 'zoom-layer');

    let transform = d3.zoomIdentity;

    const zoom = d3.zoom()
        .scaleExtent([0.2, 8])
        .filter(event => event.type === 'wheel')
        .on('zoom', event => {
            transform = event.transform;
            zoomG.attr('transform', transform);
        });

    svg.call(zoom);

    // Right-click pan
    let panning = false;
    let panStart = null;
    let transformAtPanStart = null;

    svg.on('contextmenu', event => event.preventDefault())
        .on('mousedown.pan', event => {
            if (event.button !== 2) return;
            panning = true;
            panStart = [event.clientX, event.clientY];
            transformAtPanStart = transform;
            svg.style('cursor', 'move');
        });

    d3.select(window)
        .on('mousemove.pan', event => {
            if (!panning) return;
            const dx = event.clientX - panStart[0];
            const dy = event.clientY - panStart[1];
            transform = d3.zoomIdentity
                .translate(transformAtPanStart.x + dx, transformAtPanStart.y + dy)
                .scale(transformAtPanStart.k);
            zoomG.attr('transform', transform);
            svg.call(zoom.transform, transform);
        })
        .on('mouseup.pan', event => {
            if (event.button !== 2) return;
            panning = false;
            svg.style('cursor', null);
        });

    // --- Simulation ---
    const sim = d3.forceSimulation(nodes)
        .force('center',  d3.forceCenter(W / 2, H / 2).strength(0.08))
        .force('collide', d3.forceCollide(d => d.r + 4).strength(0.85).iterations(3))
        .force('x',       d3.forceX(W / 2).strength(0.04))
        .force('y',       d3.forceY(H / 2).strength(0.04))
        .alphaDecay(0.02)
        .velocityDecay(0.35);

    // --- Render ---
    zoomG.selectAll('*').remove();

    const node = zoomG.append('g')
        .selectAll('g.bubble')
        .data(nodes).join('g')
        .attr('class', 'bubble')
        .style('cursor', onClick ? 'pointer' : 'grab');

    node.append('circle')
        .attr('r',             d => d.r)
        .attr('fill',          d => d.color.fill)
        .attr('stroke',        d => d.color.stroke)
        .attr('stroke-width',  1.5)
        .style('transition',   'r 0.2s ease');

    node.append('text')
        .attr('text-anchor',    'middle')
        .attr('dy',             '-0.15em')
        .attr('font-size',      d => Math.max(11, Math.min(14, d.r * 0.28)) + 'px')
        .attr('font-weight',    '500')
        .attr('fill',           d => d.color.text)
        .attr('pointer-events', 'none')
        .text(d => d.label);

    node.append('text')
        .attr('text-anchor',    'middle')
        .attr('dy',             '1.1em')
        .attr('font-size',      d => Math.max(10, Math.min(12, d.r * 0.22)) + 'px')
        .attr('fill',           d => d.color.stroke)
        .attr('pointer-events', 'none')
        .text(d => d.value.toLocaleString());

    // --- Tooltip ---
    node
        .on('mouseenter', function (event, d) {
            d3.select(this).select('circle').attr('r', d.r * 1.12);
            tipName.textContent = d.label;
            tipVal.textContent  = (valueCol ?? 'count') + ': ' + d.value.toLocaleString();
            tip.style.opacity   = '1';
        })
        .on('mousemove', function (event) {
            const rect = wrap.getBoundingClientRect();
            tip.style.left = (event.clientX - rect.left + 14) + 'px';
            tip.style.top  = (event.clientY - rect.top  - 36) + 'px';
        })
        .on('mouseleave', function (event, d) {
            d3.select(this).select('circle').attr('r', d.r);
            tip.style.opacity = '0';
        });

    // --- Click ---
    node.on('click', function (event, d) {
        event.stopPropagation();
        const isSelected = d3.select(this).classed('selected');
        node.classed('selected', false)
            .select('circle')
            .attr('stroke-width', 1.5)
            .attr('r', n => n.r);
        if (!isSelected) {
            d3.select(this).classed('selected', true)
                .select('circle')
                .attr('stroke-width', 3)
                .attr('r', d.r * 1.12);
        }
        if (onClick) onClick(d.label, d.value, d);
    });

    // --- Drag ---
    node.call(
        d3.drag()
            .on('start', (event, d) => {
                if (!event.active) sim.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
                d3.select(event.sourceEvent.target.closest('g.bubble')).style('cursor', 'grabbing');
            })
            .on('drag', (event, d) => {
                d.fx = event.x;
                d.fy = event.y;
            })
            .on('end', (event, d) => {
                if (!event.active) sim.alphaTarget(0);
                d.fx = null;
                d.fy = null;
                d3.select(event.sourceEvent.target.closest('g.bubble')).style('cursor', onClick ? 'pointer' : 'grab');
            })
    );

    // --- Tick ---
    sim.on('tick', () => {
        node.attr('transform', d => `translate(${d.x},${d.y})`);
    });

    // --- Resize ---
    new ResizeObserver(() => {
        W = wrap.clientWidth;
        H = wrap.clientHeight;
        sim
            .force('center', d3.forceCenter(W / 2, H / 2).strength(0.08))
            .force('x',      d3.forceX(W / 2).strength(0.04))
            .force('y',      d3.forceY(H / 2).strength(0.04))
            .alpha(0.3).restart();
    }).observe(wrap);
}