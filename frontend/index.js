const { app, BrowserWindow, ipcMain, dialog, desktopCapturer } = require("electron");
const path = require("path");
const fs = require("fs");
const axios = require("axios");
const FormData = require('form-data');

let mainWindow;
let screenshotInterval;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  mainWindow.webContents.openDevTools();

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function startScreenshotInterval() {
  screenshotInterval = setInterval(async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ["screen"],
        thumbnailSize: { width: 1920, height: 1080 },
      });
      const source = sources[0];

      if (!source) throw new Error("Не удалось получить источник экрана.");

      const screenshotPath = path.join(app.getPath("desktop"), "screenshot.png");
      fs.writeFile(screenshotPath, source.thumbnail.toPNG(), async (error) => {
        if (error) {
          console.error("Error saving screenshot:", error);
        } else {
          console.log("Screenshot saved:", screenshotPath);

          const url = 'http://127.0.0.1:5002/api/v1/ocr';
          let formData = new FormData();
          formData.append('img', fs.createReadStream(screenshotPath));
          axios.post(url, formData, {
            headers: formData.getHeaders(),
          })
            .then(response => {
              console.log(response.data);
              mainWindow.webContents.send("apiResponse",  JSON.stringify(response.data));
            })
            .catch((error) => {
              console.error('Error:', error);
            });
        }
      });
    } catch (error) {
      console.error("Error capturing screen:", error);
    }
  }, 6000); // 6000 миллисекунд = 6 секунд
}

app.on("ready", () => {
  createWindow();
  startScreenshotInterval();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    clearInterval(screenshotInterval);
    app.quit();
  }
});
