// ============================================================
// CONFIG — Google Apps Script Web App URL
// ============================================================
const API_URL = "https://script.google.com/macros/s/AKfycbytna6gz9sE31tX_i00k1v9MAp9QyvKZwGYTao_r9B8qIVW1DcXUdyOl_Zb_kmcsFO2/exec";

// agentStructure يتم تعبئته ديناميكيًا من شيت جوجل (عمود B = Login ID, عمود F = Group="OTC")
let agentStructure = {};
let currentUser = null; // { username, fullName, role }
let activeFilters = ["AVAIL", "ACD", "AUX", "RING", "LOGGED OFF"];

// ============================================================
// API HELPERS
// (POST بدون Content-Type مخصص لتفادي مشاكل CORS Preflight مع Apps Script)
// ============================================================
async function apiGet(action) {
    const res = await fetch(`${API_URL}?action=${encodeURIComponent(action)}`);
    return res.json();
}

async function apiPost(payload) {
    const res = await fetch(API_URL, {
        method: "POST",
        body: JSON.stringify(payload),
    });
    return res.json();
}

// ============================================================
// LOGIN / SESSION
// ============================================================
async function handleLogin() {
    const username = document.getElementById('loginUser').value.trim();
    const password = document.getElementById('loginPass').value.trim();
    const errEl = document.getElementById('loginError');
    errEl.innerText = "";

    if (!username || !password) {
        errEl.innerText = "من فضلك ادخل اليوزر والباسورد";
        return;
    }

    try {
        const result = await apiPost({ action: "login", username, password });
        if (result.success) {
            currentUser = { username: result.username, fullName: result.fullName, role: result.role };
            sessionStorage.setItem('cms_otc_user', JSON.stringify(currentUser));
            await enterApp();
        } else {
            errEl.innerText = result.message || "بيانات الدخول غير صحيحة";
        }
    } catch (e) {
        errEl.innerText = "تعذر الاتصال بالسيرفر. تأكد من رابط الـ API.";
    }
}

function logout() {
    currentUser = null;
    sessionStorage.removeItem('cms_otc_user');
    document.getElementById('appWrap').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginUser').value = '';
    document.getElementById('loginPass').value = '';
}

async function enterApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('appWrap').style.display = 'flex';
    document.getElementById('userFullName').innerText = currentUser.fullName;
    document.getElementById('userRole').innerText = currentUser.role;
    document.getElementById('adminBtn').style.display = (currentUser.role === 'Admin') ? 'block' : 'none';
    await fetchStructure();
}

// استعادة الجلسة عند عمل Refresh للمتصفح
window.addEventListener('DOMContentLoaded', async () => {
    const saved = sessionStorage.getItem('cms_otc_user');
    if (saved) {
        currentUser = JSON.parse(saved);
        await enterApp();
    }
});

// ============================================================
// STRUCTURE (Sheet: column B = Login ID, column F = Group -> OTC only)
// ============================================================
async function fetchStructure() {
    try {
        const result = await apiGet('getStructure');
        if (result.success) {
            agentStructure = {};
            result.data.forEach(row => {
                if (String(row.group).trim().toUpperCase() === 'OTC') {
                    agentStructure[row.id] = row.name;
                }
            });
            if (document.getElementById('adminModal').style.display !== 'none') {
                renderAdminTable(result.data.filter(r => String(r.group).trim().toUpperCase() === 'OTC'));
            }
        }
    } catch (e) {
        console.error('Failed to load structure from Google Sheet', e);
    }
}

// ============================================================
// ORIGINAL LOGIC — UNCHANGED
// ============================================================
function fixTime(val) {
    if (!val || val.trim() === "") return "0:00:00";
    let timeStr = val.trim();
    if (!timeStr.includes(":")) {
        let totalSeconds = parseInt(timeStr);
        if (isNaN(totalSeconds)) return "0:00:00";
        let hrs = Math.floor(totalSeconds / 3600);
        let mins = Math.floor((totalSeconds % 3600) / 60);
        let secs = totalSeconds % 60;
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    let p = timeStr.split(':');
    if (p.length === 2) return `0:${p[0].padStart(2, '0')}:${p[1].padStart(2, '0')}`;
    if (p.length === 3) return `${p[0]}:${p[1].padStart(2, '0')}:${p[2].padStart(2, '0')}`;
    return timeStr;
}

function processAll() {
    const cmsRaw = document.getElementById('dataInput').value;
    const shiftRaw = document.getElementById('shiftInput').value;

    const tbody = document.getElementById('dataTableBody');
    tbody.innerHTML = "";

    let loggedOffCount = 0;
    let countStaffed = 0;
    let countAvail = 0;
    let countAcd = 0;
    let countAux = 0;

    const loggedInAgents = new Set();

    // cms data
    if (cmsRaw) {
        const rows = cmsRaw.split('\n');
        rows.forEach(line => {
            const cols = line.split('\t');
            if (cols.length >= 10 && !line.includes("Agent Name") && !line.includes("Login ID")) {
                const id = cols[2]?.trim();

                if (!id || !agentStructure[id]) return;

                const state = cols[7]?.trim() || "OTHER";
                loggedInAgents.add(id);

                countStaffed++;
                if (state === "AVAIL") countAvail++;
                else if (state === "ACD") countAcd++;
                else if (state === "AUX") countAux++;

                if (activeFilters.includes(state)) {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="font-weight:700; color:var(--text);">${agentStructure[id]}</td>
                        <td style="color:var(--text-dim); font-family: monospace; font-size:14px;">${id}</td>
                        <td><span class="badge st-${state}">${state}</span></td>
                        <td style="font-size:11px">${cols[6] || "-"}</td>
                        <td>${cols[8] || "-"}</td>
                        <td style="font-size:11px; color:var(--text-dim)">${cols[cols.length-1] || "-"}</td>
                        <td class="time-cell">${fixTime(cols[cols.length-2])}</td>
                    `;
                    tbody.appendChild(tr);
                }
            }
        });
    }

    document.getElementById('kpi-staffed').innerText = countStaffed;
    document.getElementById('kpi-avail').innerText = countAvail;
    document.getElementById('kpi-acd').innerText = countAcd;
    document.getElementById('kpi-aux').innerText = countAux;

    if (shiftRaw) {
        const shiftRows = shiftRaw.split('\n');
        shiftRows.forEach(line => {
            const parts = line.split('\t');
            if (parts.length >= 3) {
                const loginId = parts[1]?.trim();

                if (!loginId || !agentStructure[loginId]) return;

                const shiftStatus = parts[parts.length - 1]?.trim().toUpperCase();
                const offStates = ["DO", "UNPAID", "PLANNED SICK", "ANNUAL", "MATERNITY", " Sick Dayoff", "STUDY LEAVE", ""];
                const hasShift = !offStates.includes(shiftStatus);

                if (hasShift && !loggedInAgents.has(loginId)) {
                    loggedOffCount++;

                    if (activeFilters.includes("LOGGED OFF")) {
                        const name = agentStructure[loginId];

                        const tr = document.createElement('tr');
                        tr.className = "row-off";
                        tr.innerHTML = `
                            <td style="font-weight:700; color:#dc2626;">${name}</td>
                            <td style="color:var(--text-dim); font-family: monospace; font-size:14px;">${loginId}</td>
                            <td><span class="badge" style="background:var(--logoff); color:white;">LOGGED OFF</span></td>
                            <td style="font-size:11px; color:#dc2626; font-weight: bold;">Missing from CMS</td>
                            <td>-</td>
                            <td style="font-size:11px; font-weight:bold; color:var(--text-dim)">Shift: ${parts[parts.length - 1]}</td>
                            <td class="time-cell" style="color:var(--logoff)">-</td>
                        `;
                        tbody.appendChild(tr);
                    }
                }
            }
        });
    }

    document.getElementById('kpi-loggedoff').innerText = loggedOffCount;
}

function toggleFilter(btn) {
    const st = btn.getAttribute('data-st');
    btn.classList.toggle('active');
    if (btn.classList.contains('active')) activeFilters.push(st);
    else activeFilters = activeFilters.filter(x => x !== st);
    processAll();
}

function resetAll() {
    document.getElementById('dataInput').value = "";
    document.getElementById('shiftInput').value = "";
    document.querySelectorAll('.kpi-value').forEach(v => {
        v.innerText = "0";
    });
    document.getElementById('dataTableBody').innerHTML = "";
    activeFilters = ["AVAIL", "ACD", "AUX", "RING", "LOGGED OFF"];
    document.querySelectorAll('.slicer-btn').forEach(btn => btn.classList.add('active'));
}

// ============================================================
// EXCEL EXPORT
// ============================================================
function exportToExcel() {
    const headers = ["Agent Name", "Login ID", "State", "AUX Reason", "Direction", "Skill / Shift Details", "Time in State"];
    const rows = [headers];

    document.querySelectorAll('#dataTableBody tr').forEach(tr => {
        const cells = Array.from(tr.children).map(td => td.innerText.trim());
        rows.push(cells);
    });

    if (rows.length === 1) {
        alert("لا يوجد بيانات لتصديرها. اعمل Process الأول.");
        return;
    }

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 12 }, { wch: 12 }, { wch: 16 }, { wch: 12 }, { wch: 28 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "OTC Mail Task");

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
    XLSX.writeFile(wb, `CMS_OTC_MailTask_${stamp}.xlsx`);
}

// ============================================================
// ADMIN — CRUD على شيت Structure
// ============================================================
function openAdmin() {
    document.getElementById('adminModal').style.display = 'flex';
    document.getElementById('admStatus').innerText = '';
    refreshAdminList();
}

function closeAdmin() {
    document.getElementById('adminModal').style.display = 'none';
}

async function refreshAdminList() {
    const result = await apiGet('getStructure');
    if (result.success) {
        renderAdminTable(result.data.filter(r => String(r.group).trim().toUpperCase() === 'OTC'));
    }
}

function renderAdminTable(list) {
    const tbody = document.getElementById('adminTableBody');
    tbody.innerHTML = '';
    list.forEach(agent => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${agent.id}</td>
            <td>${agent.name}</td>
            <td>${agent.group}</td>
            <td class="admin-actions">
                <button class="btn-secondary" onclick='editAgentPrompt(${JSON.stringify(agent)})'>تعديل</button>
                <button class="btn-danger" onclick="deleteAgentPrompt('${agent.id}')">حذف</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function submitAgentForm() {
    const id = document.getElementById('admId').value.trim();
    const name = document.getElementById('admName').value.trim();
    const group = document.getElementById('admGroup').value.trim() || 'OTC';
    const statusEl = document.getElementById('admStatus');

    if (!id || !name) {
        statusEl.style.color = 'var(--logoff)';
        statusEl.innerText = 'اكتب الـ Login ID والاسم.';
        return;
    }

    statusEl.style.color = 'var(--text-dim)';
    statusEl.innerText = 'جاري الحفظ...';

    const editingOldId = document.getElementById('admId').dataset.editing;
    const payload = editingOldId
        ? { action: 'editAgent', oldId: editingOldId, id, name, group }
        : { action: 'addAgent', id, name, group };

    const result = await apiPost(payload);
    if (result.success) {
        statusEl.style.color = 'var(--avail)';
        statusEl.innerText = 'تم الحفظ بنجاح ✔';
        document.getElementById('admId').value = '';
        document.getElementById('admName').value = '';
        document.getElementById('admGroup').value = 'OTC';
        delete document.getElementById('admId').dataset.editing;
        await refreshAdminList();
        await fetchStructure();
    } else {
        statusEl.style.color = 'var(--logoff)';
        statusEl.innerText = result.message || 'حدث خطأ، حاول مرة أخرى.';
    }
}

function editAgentPrompt(agent) {
    document.getElementById('admId').value = agent.id;
    document.getElementById('admId').dataset.editing = agent.id;
    document.getElementById('admName').value = agent.name;
    document.getElementById('admGroup').value = agent.group;
    document.getElementById('admStatus').innerText = `بتعدل بيانات: ${agent.name}`;
}

async function deleteAgentPrompt(id) {
    if (!confirm(`متأكد إنك عايز تمسح الموظف صاحب الـ Login ID: ${id}؟`)) return;
    const result = await apiPost({ action: 'deleteAgent', id });
    if (result.success) {
        await refreshAdminList();
        await fetchStructure();
    } else {
        alert(result.message || 'تعذر الحذف');
    }
}