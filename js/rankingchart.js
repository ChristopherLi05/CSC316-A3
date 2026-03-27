/**
 * rankingChart.js
 * Horizontal bar chart showing top/bottom N departments by score type.
 * Syncs with the histogram's score-type selector via renderRankingChart()'s returned API.
 */
function renderRankingChart(rows, { svgId, wrapId } = {}) {
    // ── state ──────────────────────────────────────────────────────────────
    let currentType = "Avg";
    let currentMode = "top";   // "top" | "bottom"
    let currentN    = 10;

    // ── geometry ───────────────────────────────────────────────────────────
    const margin = { top: 24, right: 120, bottom: 48, left: 80 };

    const wrap = document.getElementById(wrapId);
    const totalW = wrap.clientWidth;
    const totalH = Math.max(420, currentN * 38 + margin.top + margin.bottom);

    const svg = d3.select(`#${svgId}`)
        .attr("width",  totalW)
        .attr("height", totalH);

    const innerW = totalW - margin.left - margin.right;

    // root group
    const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // x-axis group (appended once, updated each render)
    const xAxisG = g.append("g").attr("class", "x-axis");
    const yAxisG = g.append("g").attr("class", "y-axis");

    // x-axis label
    g.append("text")
        .attr("class", "x-label")
        .attr("text-anchor", "middle")
        .attr("x", innerW / 2)
        .attr("fill", "var(--text-muted, #6c757d)")
        .style("font-size", "12px");

    // ── helpers ────────────────────────────────────────────────────────────
    const scoreKeys = ["INS1", "INS2", "INS3", "INS4", "INS5", "INS6"];
    const typeLabel = {
        Avg:  "Average of all Scores",
        INS1: "[INS1] Intellectually Stimulating",
        INS2: "[INS2] Deeper Understanding",
        INS3: "[INS3] Good Learning Atmosphere",
        INS4: "[INS4] Assignments Improved Understanding",
        INS5: "[INS5] Assignments Demo'd Understanding",
        INS6: "[INS6] Overall Course Quality",
    };

    function computeDeptStats(type) {
        // group rows by dept
        const byDept = d3.group(rows, r => r.dept);
        const stats = [];

        byDept.forEach((deptRows, dept) => {
            const vals = deptRows
                .map(r => {
                    if (type === "Avg") {
                        const nums = scoreKeys.map(k => +r[k]).filter(v => !isNaN(v) && v > 0);
                        return nums.length ? d3.mean(nums) : NaN;
                    }
                    return +r[type];
                })
                .filter(v => !isNaN(v) && v > 0);

            if (vals.length >= 3) {   // at least 3 evaluations to be meaningful
                stats.push({ dept, mean: d3.mean(vals), count: vals.length });
            }
        });

        return stats;
    }

    // colour scales – one warm, one cool
    const topColor    = d3.scaleSequential()
        .interpolator(d3.interpolate("#b8e0ff", "#0060b6"));
    const bottomColor = d3.scaleSequential()
        .interpolator(d3.interpolate("#c0392b", "#ffd6d6"));

    // ── main draw ──────────────────────────────────────────────────────────
    function draw() {
        const stats = computeDeptStats(currentType);

        // sort & slice
        stats.sort((a, b) => b.mean - a.mean);
        const data = currentMode === "top"
            ? stats.slice(0, currentN)
            : stats.slice(-currentN).reverse();   // worst first

        // resize svg height to fit
        const innerH = data.length * 38;
        const totalH = innerH + margin.top + margin.bottom;
        svg.attr("height", totalH);

        // scales
        const xMin = Math.max(0, d3.min(data, d => d.mean) - 0.3);
        const xMax = Math.min(5, d3.max(data, d => d.mean) + 0.1);

        const x = d3.scaleLinear()
            .domain([xMin, xMax])
            .range([0, innerW])
            .nice();

        const y = d3.scaleBand()
            .domain(data.map(d => d.dept))
            .range([0, innerH])
            .padding(0.25);

        const colorScale = (currentMode === "top" ? topColor : bottomColor)
            .domain([d3.min(data, d => d.mean), d3.max(data, d => d.mean)]);

        // ── x axis ──
        xAxisG
            .attr("transform", `translate(0,${innerH})`)
            .transition().duration(500)
            .call(
                d3.axisBottom(x)
                    .ticks(6)
                    .tickFormat(d => d.toFixed(1))
            );

        xAxisG.selectAll("line,path").attr("stroke", "#dee2e6");
        xAxisG.selectAll("text").attr("fill", "#555").style("font-size", "11px");

        // ── y axis ──
        yAxisG
            .transition().duration(500)
            .call(d3.axisLeft(y).tickSize(0).tickPadding(8));

        yAxisG.selectAll("path").attr("stroke", "none");
        yAxisG.selectAll("text")
            .attr("fill", "#333")
            .style("font-size", "11px")
            .style("font-weight", "500");

        // ── grid lines ──
        const gridLines = g.selectAll(".grid-line")
            .data(x.ticks(6));

        gridLines.enter()
            .append("line")
            .attr("class", "grid-line")
            .merge(gridLines)
            .transition().duration(500)
            .attr("x1", d => x(d)).attr("x2", d => x(d))
            .attr("y1", 0).attr("y2", innerH)
            .attr("stroke", "#e9ecef")
            .attr("stroke-dasharray", "3,3");

        gridLines.exit().remove();

        // ── bars ──
        const bars = g.selectAll(".rank-bar")
            .data(data, d => d.dept);

        // enter
        bars.enter()
            .append("rect")
            .attr("class", "rank-bar")
            .attr("x", 0)
            .attr("y", d => y(d.dept))
            .attr("width", 0)
            .attr("height", y.bandwidth())
            .attr("rx", 4)
            .attr("fill", d => colorScale(d.mean))
            .on("mouseover", function (event, d) {
                d3.select(this).attr("opacity", 0.8);
                tooltip.style("display", "block")
                    .html(`<strong>${DeptMapping[d.dept] ?? d.dept}</strong><br/>Score: ${d.mean.toFixed(3)}<br/>Evaluations: ${d.count}`);
            })
            .on("mousemove", function (event) {
                const [mx, my] = d3.pointer(event, svg.node());
                tooltip
                    .style("left", (mx + 12) + "px")
                    .style("top",  (my - 10) + "px");
            })
            .on("mouseout", function () {
                d3.select(this).attr("opacity", 1);
                tooltip.style("display", "none");
            })
            .transition().duration(600).ease(d3.easeCubicOut)
            .attr("width", d => Math.max(0, x(d.mean) - x(xMin)));

        // update
        bars.transition().duration(600).ease(d3.easeCubicOut)
            .attr("y",      d => y(d.dept))
            .attr("height", y.bandwidth())
            .attr("fill",   d => colorScale(d.mean))
            .attr("width",  d => Math.max(0, x(d.mean) - x(xMin)));

        bars.exit()
            .transition().duration(300)
            .attr("width", 0)
            .remove();

        // ── value labels ──
        const labels = g.selectAll(".rank-label")
            .data(data, d => d.dept);

        labels.enter()
            .append("text")
            .attr("class", "rank-label")
            .attr("x", d => x(d.mean) + 6)
            .attr("y", d => y(d.dept) + y.bandwidth() / 2 + 4)
            .attr("fill", "#444")
            .style("font-size", "11px")
            .style("opacity", 0)
            .text(d => d.mean.toFixed(2))
            .transition().duration(700)
            .style("opacity", 1);

        labels.transition().duration(600)
            .attr("x", d => x(d.mean) + 6)
            .attr("y", d => y(d.dept) + y.bandwidth() / 2 + 4)
            .text(d => d.mean.toFixed(2));

        labels.exit().remove();

        // ── x label ──
        svg.select(".x-label")
            .attr("y", totalH - 4)
            .text(typeLabel[currentType] ?? currentType);
    }

    // ── tooltip ────────────────────────────────────────────────────────────
    const tooltip = d3.select(wrap)
        .append("div")
        .style("position",   "absolute")
        .style("display",    "none")
        .style("background", "rgba(255,255,255,0.97)")
        .style("border",     "1px solid #dee2e6")
        .style("border-radius", "6px")
        .style("padding",    "8px 12px")
        .style("font-size",  "12px")
        .style("pointer-events", "none")
        .style("box-shadow", "0 2px 8px rgba(0,0,0,0.12)")
        .style("z-index",    "10");

    // make wrap position:relative so tooltip is anchored correctly
    d3.select(wrap).style("position", "relative");

    // initial draw
    draw();

    // ── public API ─────────────────────────────────────────────────────────
    return {
        setType(type) {
            currentType = type;
            draw();
        },
        setMode(mode) {   // "top" | "bottom"
            currentMode = mode;
            draw();
        },
        setN(n) {
            currentN = n;
            draw();
        },
    };
}