const { contextBridge, ipcRenderer, webUtils } = require('electron');

contextBridge.exposeInMainWorld('crossing', {
  getState: () => ipcRenderer.invoke('state:get'),
  saveState: (state) => ipcRenderer.invoke('state:save', state),

  getProjectsRoot: () => ipcRenderer.invoke('projects:getRoot'),
  chooseProjectsRoot: () => ipcRenderer.invoke('projects:chooseRoot'),
  createProject: (discipline, project) => ipcRenderer.invoke('projects:create', discipline, project),
  listProjectImages: (dir) => ipcRenderer.invoke('projects:listImages', dir),
  thumbnail: (file, maxPx) => ipcRenderer.invoke('projects:thumbnail', file, maxPx),
  revealProject: (target) => ipcRenderer.invoke('projects:reveal', target),
  pickFiles: () => ipcRenderer.invoke('projects:pickFiles'),

  // Fires when anything under the projects root changes on disk.
  onProjectsChanged: (cb) => {
    const handler = () => cb();
    ipcRenderer.on('projects:changed', handler);
    return () => ipcRenderer.off('projects:changed', handler);
  },

  // Real path for a dropped File — the only supported way under sandbox.
  pathForFile: (file) => webUtils.getPathForFile(file),
});
