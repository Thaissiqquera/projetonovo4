
let sections;
document.addEventListener('DOMContentLoaded', () => {
  sections = document.querySelectorAll('.section');
  document.querySelectorAll('.nav-buttons button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-buttons button').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const secId = btn.getAttribute('data-section');
      sections.forEach(s => s.id === secId ? s.style.display = '' : s.style.display = 'none');
    });
  });
  document.querySelector('.nav-buttons button[data-section="clustersSection"]').click();
  renderCharts();
});

async function fetchData(file) {
  const res = await fetch('/' + file);
  if (!res.ok) throw new Error(`Falha ao carregar ${file}: ${res.status}`);
  return res.json();
}

function populateClusterFilter(data) {
  const sel = document.getElementById('clusterFilter');
  [...new Set(data.map(p=>p.cluster))].sort().forEach(c=>{
    sel.innerHTML += `<option value="${c}">Cluster ${c}</option>`;
  });
  sel.addEventListener('change', () => updateClusterChart(data));
}

function updateClusterChart(data) {
  const selVal = document.getElementById('clusterFilter').value;
  const filtered = selVal==='all'?data:data.filter(p=>p.cluster==selVal);
  clusterChart.data.datasets[0].data = filtered.map(p=>({x:p.pca1,y:p.pca2}));
  clusterChart.data.datasets[0].backgroundColor = filtered.map(p=>['#FF6384','#36A2EB','#FFCE56'][p.cluster]);
  clusterChart.update();
}

function populateCampanhaFilter(data) {
  const sel = document.getElementById('campanhaFilter');
  [...new Set(data.map(c=>c.campanha))].forEach(name=>{
    sel.innerHTML += `<option value="${name}">${name}</option>`;
  });
  sel.addEventListener('change', () => updateCampanhaSection(data));
}

function updateCampanhaSection(data) {
  const val = document.getElementById('campanhaFilter').value;
  const filtered = val==='all'?data:data.filter(c=>c.campanha===val);
  campanhaChart.data.labels = filtered.map(c=>c.campanha);
  campanhaChart.data.datasets[0].data = filtered.map(c=>c.gasto_medio_por_cliente);
  campanhaChart.data.datasets[1].data = filtered.map(c=>c.roi_estimado);
  campanhaChart.update();
  updateSuggestions(filtered);
}

function updateSuggestions(data) {
  const ul = document.getElementById('suggestionList');
  ul.innerHTML = '';
  data.forEach(c=>{
    const roi = c.roi_estimado;
    let msg = roi<1?`ROI baixo (${roi.toFixed(2)})`:
              roi<2?`ROI moderado (${roi.toFixed(2)})`:
                     `ROI alto (${roi.toFixed(2)})`;
    ul.innerHTML += `<li>${c.campanha}: ${msg}</li>`;
  });
}

async function renderCharts() {
  const clusterData = await fetchData('cluster_points.json');
  const clusterDiag = await fetchData('cluster_diagnostico.json');
  const campData = await fetchData('preferencias_campanhas.json');
  const regData = await fetchData('regression_coeffs.json');
  const clvData = await fetchData('clv_segments.json');
  const satData = await fetchData('satisfacao.json');

  // Clusters scatter
  const ctx1 = document.getElementById('clusterChart').getContext('2d');
  window.clusterChart = new Chart(ctx1, {
    type: 'scatter',
    data: { datasets: [{ label:'Clusters', data: clusterData.map(p=>({x:p.pca1,y:p.pca2})),
      backgroundColor: clusterData.map(p=>['#FF6384','#36A2EB','#FFCE56'][p.cluster]) }] },
    options:{scales:{x:{title:{display:true,text:'PCA1'}},y:{title:{display:true,text:'PCA2'}}}}
  });
  populateClusterFilter(clusterData);

  // Cluster diag
  const ctx2 = document.getElementById('clusterDiagChart').getContext('2d');
  new Chart(ctx2, {
    type:'bar',
    data:{labels:clusterDiag.map(c=>'Cluster '+c.cluster),
      datasets:[
        {label:'Freq Compras', data:clusterDiag.map(c=>c.frequencia_compras)},
        {label:'Total Gasto', data:clusterDiag.map(c=>c.total_gasto)},
        {label:'Última Compra', data:clusterDiag.map(c=>c.ultima_compra)}
      ]}
  });

  // Campanhas
  const ctx3 = document.getElementById('campanhaChart').getContext('2d');
  window.campanhaChart = new Chart(ctx3,{
    type:'bar',
    data:{labels:campData.map(c=>c.campanha),
      datasets:[
        {label:'Gasto Médio/Cliente', data:campData.map(c=>c.gasto_medio_por_cliente)},
        {label:'ROI Estimado', data:campData.map(c=>c.roi_estimado)}
      ]}
  });
  populateCampanhaFilter(campData);
  updateSuggestions(campData);

  // Regression
  const ctx4 = document.getElementById('regressionChart').getContext('2d');
  new Chart(ctx4,{type:'bar',data:{labels:regData.map(r=>r.variable),datasets:[{label:'Coeficiente',data:regData.map(r=>r.coefficient)}]}});

  // CLV
  const ctx5 = document.getElementById('clvChart').getContext('2d');
  new Chart(ctx5,{type:'pie',data:{labels:clvData.map(c=>c.segmento_valor||c.index),datasets:[{data:clvData.map(c=>c.count)}]}});

  // Satisfacao table
  const tbody = document.querySelector('#satisfacaoTable tbody');
  satData.forEach(s=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${s.campanha}</td><td>${s.satisfacao_media}</td>`;
    tbody.appendChild(tr);
  });
}
