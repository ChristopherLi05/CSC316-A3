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

const DeptMapping = {
    "AFR": "African Studies",
    "ANA": "Anatomy",
    "ANT": "Anthropology",
    "ARCLA": "Architectural Studies",
    "AST": "Astronomy and Astrophysics",
    "BCH": "Biochemistry",
    "CCS": "Caribbean Studies",
    "CERES": "European, Russian, and Eurasian Studies",
    "CHM": "Chemistry",
    "CINE": "Cinema Studies",
    "CLAS": "Classics",
    "CRIM": "Criminology",
    "CSB": "Cell and Systems Biology",
    "CSC": "Computer Science",
    "CSUS": "Canadian Studies",
    "DRAMA": "Drama, Theatre and Performance Studies",
    "EAS": "East Asian Studies",
    "ECO": "Economics",
    "EEB": "Ecology and Evolutionary Biology",
    "ENG": "English",
    "ENT": "Entomology",
    "ENVMT": "Environment / Environmental Studies",
    "ES": "Earth Sciences",
    "ETHIC": "Ethics",
    "FAR": "Fine Art History",
    "FOR": "Forestry",
    "FRE": "French",
    "GER": "German",
    "GGR": "Geography",
    "GLAF": "Global Affairs",
    "GLG": "Geology",
    "HIS": "History",
    "HMB": "Human Biology",
    "IHPST": "History and Philosophy of Science and Technology",
    "IMM": "Immunology",
    "INNIS": "Innis College",
    "IRE": "Industrial Relations",
    "ITA": "Italian",
    "JSP": "Jewish Studies",
    "LAS": "Latin American Studies",
    "LIN": "Linguistics",
    "LMP": "Laboratory Medicine and Pathobiology",
    "MAT": "Mathematics",
    "MEDGM": "Medical Genomics",
    "MST": "Medieval Studies",
    "MUSIC": "Music",
    "NEW": "New College",
    "NMC": "Near and Middle Eastern Civilizations",
    "NUSCI": "Nutritional Sciences",
    "OISUT": "OISE Undergraduate Teaching",
    "OTC": "Orthodox Theology / Old Testament Studies",
    "PCL": "Pharmacology",
    "PHL": "Philosophy",
    "PHM": "Pharmacy",
    "PHY": "Physics",
    "POL": "Political Science",
    "PSL": "Physiology",
    "PSY": "Psychology",
    "RLG": "Religion",
    "SAS": "South Asian Studies",
    "SDST": "Sexual Diversity Studies",
    "SLA": "Slavic Languages and Literatures",
    "SMC": "St. Michael's College",
    "SOC": "Sociology",
    "SPA": "Spanish",
    "SPP": "School of Public Policy and Governance",
    "STAT": "Statistical Sciences",
    "TRIN": "Trinity College",
    "UC": "University College",
    "VIC": "Victoria College",
    "WDW": "Woodsworth College",
    "WGSI": "Women and Gender Studies Institute"
}


function renderBubbleChart(rows, onClick = null) {
    const groupBy = 'dept'
    const valueCol = null
    const wrapId = 'wrap'
    const svgId = 'bubble-chart-svg'
    const tipId = 'tip'
    const minR = 28
    const maxR = 80

    const wrap = document.getElementById(wrapId);
    const svg = d3.select(`#${svgId}`);
    const tip = document.getElementById(tipId);
    const tipName = tip.querySelector('[data-tip-name]');
    const tipVal = tip.querySelector('[data-tip-val]');

    // --- Aggregate ---
    const grouped = d3.rollup(
        rows,
        v => valueCol ? d3.sum(v, d => +d[valueCol]) : v.length,
        d => d[groupBy]
    );

    const avgScore = d3.rollup(
        rows,
        v => {
            const cols = ['INS1', 'INS2', 'INS3', 'INS4', 'INS5', 'INS6'];
            const vals = v.flatMap(d => cols.map(c => +d[c]).filter(x => !isNaN(x) && x > 0));
            return vals.length ? d3.mean(vals) : null;
        },
        d => d[groupBy]
    );

    const q1 = d3.quantile(avgScore.values().toArray().slice().sort(d3.ascending), 0.25);
    const q3 = d3.quantile(avgScore.values().toArray().slice().sort(d3.ascending), 0.75);

    // const colorScale = d3.scaleLinear()
    //     .domain(d3.extent(avgScore.values()))
    //     .range(['#1d4ed8', '#7c3aed', '#dc2626']);

    const colorScale = d3.scaleLinear()
        .domain([q1, d3.mean(avgScore.values()), q3])
        .range(['#dc2626', '#7c3aed', '#1d4ed8'])
        .clamp(true);


    const keys = Array.from(grouped.keys()).sort();
    // const colorMap = new Map(keys.map((k, i) => [k, PALETTE[i % PALETTE.length]]));

    const rScale = d3.scaleSqrt()
        .domain([0, d3.max(grouped.values())])
        .range([minR, maxR]);

    let W = wrap.clientWidth;
    let H = wrap.clientHeight;

    // const nodes = keys.map(key => ({
    //     label: key,
    //     value: grouped.get(key),
    //     r:     rScale(grouped.get(key)),
    //     color: colorMap.get(key),
    // }));

    const nodes = keys.map(key => {
        const score = avgScore.get(key);
        const base = score != null ? colorScale(score) : '#888888';
        const c = d3.color(base);
        c.opacity = 0.15;
        return {
            label: key,
            value: grouped.get(key),
            score: score,
            r: rScale(grouped.get(key)),
            color: {
                fill: c.toString(),
                stroke: base,
                text: base,
            },
        };
    });

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
        .force('center', d3.forceCenter(W / 2, H / 2).strength(0.08))
        .force('collide', d3.forceCollide(d => d.r + 4).strength(0.85).iterations(3))
        .force('x', d3.forceX(W / 2).strength(0.04))
        .force('y', d3.forceY(H / 2).strength(0.04))
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
        .attr('r', d => d.r)
        .attr('fill', d => d.color.fill)
        .attr('stroke', d => d.color.stroke)
        .attr('stroke-width', 1.5)
        .style('transition', 'r 0.2s ease');

    node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '-0.15em')
        .attr('font-size', d => Math.max(11, Math.min(14, d.r * 0.28)) + 'px')
        .attr('font-weight', '500')
        .attr('fill', d => d.color.text)
        .attr('pointer-events', 'none')
        .text(d => d.label);

    node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.1em')
        .attr('font-size', d => Math.max(10, Math.min(12, d.r * 0.22)) + 'px')
        .attr('fill', d => d.color.stroke)
        .attr('pointer-events', 'none')
        .text(d => d.value.toLocaleString());

    // --- Tooltip ---
    node
        .on('mouseenter', function (event, d) {
            d3.select(this).select('circle').attr('r', d.r * 1.12);
            tipName.textContent = DeptMapping[d.label] ?? d.label;
            tipVal.innerHTML = (d.score != null ? `Avg Score: ${d.score.toFixed(2)}<br>` : '') + `Count: ${d.value.toLocaleString()}`;
            tip.style.opacity = '1';
        })
        .on('mousemove', function (event) {
            const rect = wrap.getBoundingClientRect();
            tip.style.left = (event.clientX - rect.left + 14) + 'px';
            tip.style.top = (event.clientY - rect.top - 36) + 'px';
        })
        .on('mouseleave', function (event, d) {
            d3.select(this).select('circle').attr('r', d.r);
            tip.style.opacity = '0';
        });

    // --- Click ---
    node.on('click', function (event, d) {
        event.stopPropagation();
        if (onClick) onClick(d.label, d.value, d);
    });

    // --- changeDept event ---
    window.addEventListener('changeDept', event => {
        const selectedDept = event.detail.selectedDept;

        node.classed('selected', false)
            .select('circle')
            .attr('stroke-width', 1.5)
            .attr('r', n => n.r);

        if (selectedDept != null) {
            const match = node.filter(d => d.label === selectedDept);
            if (!match.empty()) {
                match.classed('selected', true)
                    .select('circle')
                    .attr('stroke-width', 3)
                    .attr('r', d => d.r * 1.12);
            }
        }
    });

    // --- Drag ---
    node.call(
        d3.drag()
            .on('start', (event, d) => {
                if (!event.active) sim.alphaTarget(0.15).restart();
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
            .force('x', d3.forceX(W / 2).strength(0.04))
            .force('y', d3.forceY(H / 2).strength(0.04))
            .alpha(0.3).restart();
    }).observe(wrap);

    function renderLegend(colorScale, allAvgs) {
        const existingLegend = document.getElementById('bubble-legend');
        if (existingLegend) existingLegend.remove();

        const min = d3.min(allAvgs);
        const max = d3.max(allAvgs);
        const mean = d3.mean(allAvgs);

        const legend = document.createElement('div');
        legend.id = 'bubble-legend';
        legend.style.cssText = `
        position: absolute;
        bottom: 16px;
        right: 16px;
        background: white;
        border: 1px solid #e5e7eb;
        border-radius: 8px;
        padding: 10px 14px;
        font-size: 12px;
        color: #374151;
        pointer-events: none;
    `;

        const gradientId = 'legend-gradient';
        const svgNS = 'http://www.w3.org/2000/svg';
        const legendSvg = document.createElementNS(svgNS, 'svg');
        legendSvg.setAttribute('width', '160');
        legendSvg.setAttribute('height', '40');

        const defs = document.createElementNS(svgNS, 'defs');
        const gradient = document.createElementNS(svgNS, 'linearGradient');
        gradient.setAttribute('id', gradientId);
        gradient.setAttribute('x1', '0%');
        gradient.setAttribute('x2', '100%');

        // Sample the color scale across 10 stops
        for (let i = 0; i <= 10; i++) {
            const t = i / 10;
            const val = min + t * (max - min);
            const stop = document.createElementNS(svgNS, 'stop');
            stop.setAttribute('offset', `${t * 100}%`);
            stop.setAttribute('stop-color', colorScale(val));
            gradient.appendChild(stop);
        }

        defs.appendChild(gradient);
        legendSvg.appendChild(defs);

        const rect = document.createElementNS(svgNS, 'rect');
        rect.setAttribute('x', '0');
        rect.setAttribute('y', '0');
        rect.setAttribute('width', '160');
        rect.setAttribute('height', '16');
        rect.setAttribute('rx', '3');
        rect.setAttribute('fill', `url(#${gradientId})`);
        legendSvg.appendChild(rect);

        const labels = [
            { x: 0,   anchor: 'start',  val: min },
            { x: 80,  anchor: 'middle', val: mean },
            { x: 160, anchor: 'end',    val: max },
        ];

        labels.forEach(({ x, anchor, val }) => {
            const text = document.createElementNS(svgNS, 'text');
            text.setAttribute('x', x);
            text.setAttribute('y', '32');
            text.setAttribute('text-anchor', anchor);
            text.setAttribute('font-size', '10');
            text.setAttribute('fill', '#6b7280');
            text.textContent = val.toFixed(2);
            legendSvg.appendChild(text);
        });

        const label = document.createElement('div');
        label.textContent = 'Avg Score';
        label.style.cssText = 'margin-bottom: 6px; font-weight: 600; font-size: 11px; color: #111827;';

        legend.appendChild(label);
        legend.appendChild(legendSvg);
        wrap.style.position = 'relative';
        wrap.appendChild(legend);
    }

    const allAvgs = Array.from(avgScore.values()).filter(v => v != null);
    renderLegend(colorScale, allAvgs);
}

