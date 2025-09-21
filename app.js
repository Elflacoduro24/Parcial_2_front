const baseUsers = [{ username: 'admin', password: 'admin' }]
const authKey = 'pv_auth'
const todosKey = 'pv_todos'
const externalKey = 'pv_external'
const usersKey = 'pv_users'

// Cargar usuarios (base + registrados en localStorage)
function loadUsers() {
  const stored = JSON.parse(localStorage.getItem(usersKey) || '[]')
  return baseUsers.concat(stored)
}

// Guardar usuario nuevo en localStorage
function registerUser(username, password) {
  const stored = JSON.parse(localStorage.getItem(usersKey) || '[]')
  // Validar que no exista ya
  if (stored.some(u => u.username === username)) {
    return { ok: false, msg: 'Usuario ya existe' }
  }
  stored.push({ username, password })
  localStorage.setItem(usersKey, JSON.stringify(stored))
  return { ok: true, msg: 'Usuario registrado con éxito' }
}

// --- LOGIN PAGE ---
if (location.pathname.endsWith('index.html') || location.pathname === '/' || location.pathname.endsWith('/')) {
  const form = document.getElementById('loginForm')
  const error = document.getElementById('error')

  if (localStorage.getItem(authKey)) location.href = 'todo.html'

  form.addEventListener('submit', e => {
    e.preventDefault()
    const u = form.username.value.trim()
    const p = form.password.value.trim()
    const users = loadUsers()
    const ok = users.some(x => x.username === u && x.password === p)
    if (!ok) { error.textContent = 'Usuario o contraseña incorrectos'; return }
    localStorage.setItem(authKey, JSON.stringify({ username: u }))
    location.href = 'todo.html'
  })
}

// --- REGISTER PAGE ---
if (location.pathname.endsWith('register.html')) {
  const form = document.getElementById('registerForm')
  const msg = document.getElementById('msg')
  form.addEventListener('submit', e => {
    e.preventDefault()
    const u = form.username.value.trim()
    const p = form.password.value.trim()
    if (!u || !p) { msg.textContent = 'Campos requeridos'; return }
    const res = registerUser(u, p)
    msg.textContent = res.msg
    if (res.ok) {
      form.reset()
      setTimeout(() => location.href = 'index.html', 1200)
    }
  })
}

// --- TODO PAGE ---
if (location.pathname.endsWith('todo.html')) {
  if (!localStorage.getItem(authKey)) { location.href = 'index.html'; throw new Error('no auth') }
  const logoutBtn = document.getElementById('logoutBtn')
  const taskForm = document.getElementById('taskForm')
  const taskText = document.getElementById('taskText')
  const taskError = document.getElementById('taskError')
  const todoList = document.getElementById('todoList')

  logoutBtn.addEventListener('click', () => {
    localStorage.removeItem(authKey)
    location.href = 'index.html'
  })

  let todos = JSON.parse(localStorage.getItem(todosKey) || '[]')
  let external = JSON.parse(localStorage.getItem(externalKey) || '[]')

  function saveLocal() { localStorage.setItem(todosKey, JSON.stringify(todos)) }
  function render() {
    todoList.innerHTML = ''
    todos.forEach(t => { todoList.appendChild(buildItem(t, true)) })
    external.forEach(t => { todoList.appendChild(buildItem(t, false)) })
  }

  function buildItem(t, editable) {
    const li = document.createElement('li')
    li.className = 'todo-item'

    const left = document.createElement('div')
    left.className = 'todo-left'

    const cb = document.createElement('input')
    cb.type = 'checkbox'
    cb.checked = !!t.done
    cb.addEventListener('change', () => {
      if (!editable) return
      t.done = cb.checked
      t.updatedAt = Date.now()
      saveLocal()
      render()
    })

    const txt = document.createElement('div')
    txt.className = 'todo-text'
    txt.textContent = t.text
    if (t.done) txt.classList.add('done')

    const meta = document.createElement('div')
    meta.className = 'small-meta'
    meta.textContent = new Date(t.createdAt).toLocaleString()

    left.appendChild(cb)
    left.appendChild(txt)
    left.appendChild(meta)

    const controls = document.createElement('div')
    controls.className = 'controls'

    if (editable) {
      const edit = document.createElement('button')
      edit.className = 'icon-btn'
      edit.textContent = 'Editar'
      edit.addEventListener('click', () => editTask(t))
      controls.appendChild(edit)

      const del = document.createElement('button')
      del.className = 'icon-btn'
      del.textContent = 'Eliminar'
      del.addEventListener('click', () => {
        if (!confirm('Eliminar tarea?')) return
        todos = todos.filter(x => x.id !== t.id)
        saveLocal()
        render()
      })
      controls.appendChild(del)
    }

    li.appendChild(left)
    li.appendChild(controls)
    return li
  }

  function isOnlyNumbers(s) { return /^\\d+$/.test(s) }

  function validateText(s, idToIgnore) {
    if (!s) return 'El texto no puede estar vacío'
    const trimmed = s.trim()
    if (trimmed.length < 10) return 'Debe tener al menos 10 caracteres'
    if (isOnlyNumbers(trimmed)) return 'El texto no puede contener solo números'
    const existsLocal = todos.some(t => t.text.toLowerCase() === trimmed.toLowerCase() && t.id !== idToIgnore)
    const existsExternal = external.some(t => t.text.toLowerCase() === trimmed.toLowerCase())
    if (existsLocal || existsExternal) return 'Texto repetido'
    return ''
  }

  function editTask(t) {
    const newText = prompt('Editar tarea', t.text)
    if (newText === null) return
    const err = validateText(newText, t.id)
    if (err) { alert(err); return }
    t.text = newText.trim()
    t.updatedAt = Date.now()
    saveLocal()
    render()
  }

  taskForm.addEventListener('submit', e => {
    e.preventDefault()
    const val = taskText.value
    const err = validateText(val)
    taskError.textContent = err
    if (err) return
    const item = {
      id: Date.now(),
      text: val.trim(),
      done: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
    todos.unshift(item)
    saveLocal()
    taskText.value = ''
    render()
  })

  document.getElementById('clearAll').addEventListener('click', () => {
    if (!confirm('Borrar todas las tareas locales?')) return
    todos = []
    saveLocal()
    render()
  })

  render()

  fetch('https://dummyjson.com/c/28e8-a101-22-11')
    .then(r => r.json())
    .then(data => {
      if (!Array.isArray(data)) return
      external = data.map(x => ({
        id: x.id || Math.floor(Math.random()*1000000),
        text: x.text || '',
        done: !!x.done,
        createdAt: x.createdAt || Date.now(),
        updatedAt: x.updatedAt || x.createdAt || Date.now()
      }))
      localStorage.setItem(externalKey, JSON.stringify(external))
      render()
    })
    .catch(() => {})
}
