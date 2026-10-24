
const $ = (id) => document.getElementById(id);

const STORAGE_KEY = "hcm-lite-v1";

function emptyData() {
    return {
        company: null,
        employees: [],
        attendance: {}
    };
}

function loadData() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (!saved) return emptyData();

        const data = JSON.parse(saved);

        if (
            !data ||
            !Array.isArray(data.employees) ||
            !data.attendance ||
            typeof data.attendance !== "object"
        ) {
            return emptyData();
        }

        return {
            company: data.company || null,
            employees: data.employees,
            attendance: data.attendance
        };
    } catch {
        return emptyData();
    }
}

let data = loadData();

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
        alert("Data save nahi hua. Browser storage check karein.");
    }
}

function today() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

function escapeHTML(value) {
    return String(value).replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

// Navigation
document.querySelectorAll(".nav-btn").forEach(button => {
    button.addEventListener("click", () => {
        document.querySelectorAll(".page").forEach(page => {
            page.classList.add("hidden");
        });

        $(button.dataset.page).classList.remove("hidden");

        document.querySelectorAll(".nav-btn").forEach(nav => {
            nav.classList.remove("active");
        });

        button.classList.add("active");
        $("page-title").textContent = button.textContent.trim();

        render();
    });
});

// Company setup
$("company-form").addEventListener("submit", event => {
    event.preventDefault();

    data.company = {
        name: $("company-name").value.trim(),
        email: $("company-email").value.trim(),
        address: $("company-address").value.trim()
    };

    saveData();
    render();

    alert("Company details save ho gayi hain.");
});

// Employee registration
$("employee-form").addEventListener("submit", event => {
    event.preventDefault();

    if (!data.company) {
        alert("Pehle Company Setup complete karein.");
        return;
    }

    const name = $("employee-name").value.trim();
    const email = $("employee-email").value.trim().toLowerCase();
    const department = $("employee-department").value.trim();
    const title = $("employee-title").value.trim();
    const joiningDate = $("employee-date").value;

    if (!name || !email || !department || !title || !joiningDate) {
        alert("Tamam employee details fill karein.");
        return;
    }

    if (data.employees.some(employee => employee.email === email)) {
        alert("Is email ka employee pehle se registered hai.");
        return;
    }

    data.employees.push({
        id: crypto.randomUUID(),
        name,
        email,
        department,
        title,
        joiningDate
    });

    saveData();
    $("employee-form").reset();
    render();

    alert("Employee successfully register ho gaya!");
});

// Employee search
$("employee-search").addEventListener("input", renderEmployees);

// Delete employee
$("employee-table").addEventListener("click", event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;

    const employee = data.employees.find(
        item => item.id === button.dataset.delete
    );

    if (!employee) return;

    if (!confirm(`Kya aap ${employee.name} ko delete karna chahte hain?`)) {
        return;
    }

    data.employees = data.employees.filter(
        item => item.id !== employee.id
    );

    // Remove this employee's attendance records.
    Object.values(data.attendance).forEach(dayRecords => {
        delete dayRecords[employee.id];
    });

    saveData();
    render();
});

// Attendance
$("attendance-date").textContent = `Date: ${today()}`;

$("attendance-table").addEventListener("change", event => {
    const select = event.target.closest("[data-attendance]");
    if (!select) return;

    const employeeId = select.dataset.attendance;
    const status = select.value;
    const date = today();

    if (!data.attendance[date]) {
        data.attendance[date] = {};
    }

    if (status === "") {
        delete data.attendance[date][employeeId];
    } else {
        data.attendance[date][employeeId] = status;
    }

    saveData();
    render();
});

function renderEmployees() {
    const query = $("employee-search").value.trim().toLowerCase();

    const employees = data.employees.filter(employee =>
        [employee.name, employee.email, employee.department, employee.title]
            .some(value => value.toLowerCase().includes(query))
    );

    $("employee-table").innerHTML = employees.map(employee => `
        <tr>
            <td>${escapeHTML(employee.name)}</td>
            <td>${escapeHTML(employee.email)}</td>
            <td>${escapeHTML(employee.department)}</td>
            <td>${escapeHTML(employee.title)}</td>
            <td>
                <button class="primary" style="margin:0"
                    data-delete="${escapeHTML(employee.id)}">
                    Delete
                </button>
            </td>
        </tr>
    `).join("");

    $("employee-empty").classList.toggle("hidden", employees.length > 0);
}

function renderAttendance() {
    const records = data.attendance[today()] || {};

    $("attendance-table").innerHTML = data.employees.map(employee => {
        const current = records[employee.id] || "";

        return `
            <tr>
                <td>${escapeHTML(employee.name)}</td>
                <td>${escapeHTML(employee.department)}</td>
                <td>
                    <select class="status-select"
                        data-attendance="${escapeHTML(employee.id)}">
                        <option value="" ${current === "" ? "selected" : ""}>
                            Not marked
                        </option>
                        <option value="Present"
                            ${current === "Present" ? "selected" : ""}>
                            Present
                        </option>
                        <option value="Absent"
                            ${current === "Absent" ? "selected" : ""}>
                            Absent
                        </option>
                        <option value="Leave"
                            ${current === "Leave" ? "selected" : ""}>
                            Leave
                        </option>
                    </select>
                </td>
            </tr>
        `;
    }).join("");

    $("attendance-empty").classList.toggle(
        "hidden",
        data.employees.length > 0
    );
}

function renderDashboard() {
    const employees = data.employees;
    const records = data.attendance[today()] || {};

    $("total-employees").textContent = employees.length;

    $("present-count").textContent = employees.filter(
        employee => records[employee.id] === "Present"
    ).length;

    $("absent-count").textContent = employees.filter(
        employee => records[employee.id] === "Absent"
    ).length;

    const departments = new Set(
        employees.map(employee => employee.department.toLowerCase())
    );

    $("department-count").textContent = departments.size;

    $("company-heading").textContent = data.company
        ? `${data.company.name} • ${data.company.email}`
        : "Set up your company to get started.";

    const recent = employees.slice(-5).reverse();

    $("recent-employees").innerHTML = recent.length
        ? recent.map(employee => `
            <p style="padding:10px 0;border-bottom:1px solid #eee">
                <strong>${escapeHTML(employee.name)}</strong>
                — ${escapeHTML(employee.department)}
            </p>
        `).join("")
        : "No employees registered yet.";
}

function render() {
    if (data.company) {
        $("company-name").value = data.company.name;
        $("company-email").value = data.company.email;
        $("company-address").value = data.company.address;
    }

    $("attendance-date").textContent = `Date: ${today()}`;

    renderDashboard();
    renderEmployees();
    renderAttendance();
}

// Basic data-based HR assistant
function answerQuestion(question) {
    const q = question.toLowerCase();
    const employees = data.employees;
    const records = data.attendance[today()] || {};

    if (/\b(help|what can you do)\b/.test(q)) {
        return "Aap total employees, department list, employee names aur aaj ki attendance ke bare mein pooch sakte hain.";
    }

    if (/\b(company|organization)\b/.test(q)) {
        return data.company
            ? `Company: ${data.company.name}\nEmail: ${data.company.email}\nAddress: ${data.company.address}`
            : "Company details abhi set nahi ki gayi hain.";
    }

    if (/\b(departments?|teams?)\b/.test(q)) {
        const departments = [...new Set(
            employees.map(employee => employee.department)
        )];

        return departments.length
            ? `Recorded departments (${departments.length}): ${departments.join(", ")}`
            : "Abhi koi department employee record mein maujood nahi hai.";
    }

    if (/\b(absent|absence)\b/.test(q)) {
        const absent = employees.filter(
            employee => records[employee.id] === "Absent"
        );

        return `Aaj absent: ${absent.length}\n` +
            (absent.length
                ? absent.map(employee => employee.name).join(", ")
                : "Koi employee absent mark nahi hua.");
    }

    if (/\b(present|attendance|attended)\b/.test(q)) {
        const present = employees.filter(
            employee => records[employee.id] === "Present"
        );

        return `Aaj present: ${present.length}\n` +
            (present.length
                ? present.map(employee => employee.name).join(", ")
                : "Kisi employee ko abhi present mark nahi kiya gaya.");
    }

    if (/\b(employee|employees|staff|workforce|headcount)\b/.test(q)) {
        if (/\b(list|names|who|show)\b/.test(q)) {
            return employees.length
                ? "Registered employees:\n" +
                    employees.map(employee =>
                        `${employee.name} — ${employee.department} (${employee.title})`
                    ).join("\n")
                : "Abhi koi employee registered nahi hai.";
        }

        return `Total registered employees: ${employees.length}.`;
    }

    return "Main abhi company, employee, department aur aaj ki attendance ke recorded data par basic queries answer kar sakta hoon. Sawal ko doosre tareeqe se pooch kar dekhein.";
}

function addMessage(text, className) {
    const message = document.createElement("div");
    message.className = className;
    message.textContent = text;

    $("chat-messages").appendChild(message);
    $("chat-messages").scrollTop = $("chat-messages").scrollHeight;
}

$("chat-form").addEventListener("submit", event => {
    event.preventDefault();

    const question = $("chat-input").value.trim();
    if (!question) return;

    addMessage(question, "user-message");
    addMessage(answerQuestion(question), "bot-message");

    $("chat-input").value = "";
});

document.querySelectorAll(".suggestion").forEach(button => {
    button.addEventListener("click", () => {
        $("chat-input").value = button.textContent.trim();
        $("chat-form").requestSubmit();
    });
});

// Initial application state
render();
