var initFinSdk = () => {
  class FinSdk {
    #jsVersion = "0.0.1";
    #domainScript = `https://json.m.pro/script/${this.#jsVersion}/`;
    #srcSt = "https://finsdk_st.m.pro";
    #srcEx = "https://finsdk_ex.m.pro";
    #srcHandleFile = "https://a.ibe.app:9002";
    #callbackConnectWallet = null;
    #onRequestSecrectKey = null;
    #listCommand = {
      createHash: -1,
      getBls: -1,
      getSeed: -1,
      createWallet: -1,
      saveSerectKey: -1,
      requestSerectKey: -1,
      requireSerectKey: -1,
      renderHtml: -1,
      viewRoot: -1,
      downloadCommerce: -1,
      fetchLink: -1,
      getWalletActive: -1,
      getAllWallets: -1,
      setWalletActive: -1,
      sendTransaction: -1,
      getLastHash: -1,
      getPublicKey: -1,
      getPrivateKey: -1,
      updateWalletInfo: -1,
      getWalletInfo: -1,
      sign: -1,
    };
    #listLink = {};
    #walletSelected;
    constructor() {
      this.timeOutLoadIframe = {};
      this.isSTLoaded = false;
      this.isEXLoaded = false;
      this.isHandleFileLoaded = false;
      this.progressPercent = 0;
    }
    #isSendingTransaction = false;

    async init({ onProgress, onFinish, onError, onRequestSecrectKey }) {
      if (typeof onRequestSecrectKey == "function") {
        this.#onRequestSecrectKey = onRequestSecrectKey;
      }
      // this.#initCSS();
      this.#initFrame({
        onProgress,
        onFinish: async () => {
          const t = Date.now();
          const qrLibContent = await this.#downloadScript({
            url: `${this.#domainScript}qrcode.min.js?t=${t}`,
            name: "qrcode.min.js",
            contentLength: 19927,
          });
          if (qrLibContent) {
            var customScript = document.createElement("script");
            customScript.innerHTML = qrLibContent;
            document.head.appendChild(customScript);
          }
          const reqdQRLibContent = await this.#downloadScript({
            url: `${this.#domainScript}read_qr.min.js?t=${t}`,
            name: "read_qr.min.js",
            contentLength: 130594,
          });
          if (reqdQRLibContent) {
            var customScript = document.createElement("script");
            customScript.innerHTML = reqdQRLibContent;
            document.head.appendChild(customScript);
          }
          onFinish();
        },
        onError,
      });
    }

    async waitUntil(command, customTimeout) {
      let timeout = 0;
      return await new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          if (typeof this.#listCommand[command] != "number") {
            timeout = 0;
            resolve(true);
            clearInterval(interval);
          }
          const timeOutOfRequest = customTimeout || 5000;
          if (timeout === timeOutOfRequest) {
            clearInterval(interval);
            timeout = 0;
            reject(`MAIN Time out no response! ${command}`);
          }
          timeout += 200;
        }, 200);
      });
    }
    async #waitFetchLink(link) {
      let timeout = 0;
      this.#listLink = {
        ...this.#listLink,
        [link]: -1,
      };

      return await new Promise((resolve, reject) => {
        const interval = setInterval(() => {
          if (typeof this.#listLink[link] != "number") {
            timeout = 0;
            resolve(this.#listLink[link]);
            clearInterval(interval);
          }
          if (timeout === 15000) {
            timeout = 0;
            clearInterval(interval);
            reject("MAIN Time out no response waitFetchLink!");
          }
          timeout += 200;
        }, 200);
      });
    }

    async handleFetchLink(link) {
      try {
        this.commerceFrame.contentWindow.postMessage(
          {
            command: "fetchLink",
            value: link,
          },
          "*"
        );
        var res = await this.#waitFetchLink(link);
        this.#listLink[link] = -1;

        return res;
      } catch (error) {
        console.log("LOG_ERROR handleFetchLink", error);
      }
    }
    #sendMessageToSw = async ({ message, isWaitingResponse = true }) => {
      try {
        navigator.serviceWorker.controller.postMessage(message);
        if (!isWaitingResponse) {
          return {
            command: message,
            success: true,
          };
        }
        await this.waitUntil(message.command);
        return this.#listCommand[message.command];
      } catch (error) {
        console.log("postMessageToSw err ==> ", error);
      }
    };

    #sendSw = async ({ message, isWaitingResponse }) => {
      try {
        const res = await this.#sendMessageToSw({
          message,
          isWaitingResponse,
        });
        const command = message.command;
        const response = res.data;
        if (res.success !== true) {
          throw response;
        }
        if (typeof response == "undefined") {
          throw `Command not response - ${JSON.stringify(res)}`;
        }
        this.#listCommand[command] = -1;
        return response;
      } catch (error) {}
    };

    async #send({ iframeName, message, isWaitingResponse, option = {} }) {
      try {
        const res = await this.#sendMessage({
          iframeName,
          message,
          isWaitingResponse,
          option,
        });
        const command = message.command;
        const newListCommand = { ...this.#listCommand };
        newListCommand[command] = -1;
        this.#listCommand = { ...newListCommand };
        return { ...res };
      } catch (error) {}
    }
    async #sendMessage({
      iframeName,
      message,
      isWaitingResponse = true,
      option,
    }) {
      try {
        // if (typeof this.#listCommand[message.command] != "undefined") {
        //   this.#listCommand[message.command] = 0;
        // }
        if (iframeName === "ex") {
          this.executeFrame.contentWindow.postMessage(message, "*");
        }
        if (iframeName === "st") {
          this.storageFrame.contentWindow.postMessage(message, "*");
        }
        if (iframeName === "commerce") {
          this.commerceFrame.contentWindow.postMessage(message, "*");
        }
        if (typeof this.#listCommand[message.command] === "undefined") {
          return;
        }

        if (!isWaitingResponse) {
          return {
            command: message,
            success: true,
          };
        }
        await this.waitUntil(message.command, option.timeout);
        return this.#listCommand[message.command];
      } catch (error) {
        console.log("sendMessage err ==> ", error);
      }
    }

    async postSw({ command, value }) {
      const res = await this.#sendSw({
        message: {
          command,
          value,
        },
      });
      return res;
    }
    // #initCSS() {
    //   var link = document.createElement("link");
    //   link.rel = "stylesheet";
    //   link.type = "text/css";
    //   link.href = "/mtn-lib/index.css"; // Path to your CSS file

    //   document.head.appendChild(link);
    // }
    #initFrame({ onProgress, onFinish, onError }) {
      this.storageFrame = this.#createFrame({
        id: "fin_storage",
        src: `${this.#srcSt}/index.html`,
        onProgress,
        onFinish,
        onError,
      });

      window.addEventListener("message", async (event) => {
        // console.log('find log 1 ====> ', event)
        if (
          event.origin != this.#srcSt &&
          event.origin != this.#srcEx &&
          event.origin != this.#srcHandleFile
        ) {
          return;
        }
        console.log("find log 2 ====> ", event.data);

        const { command, data } = event.data;

        const isMessageFromEx = event.origin === this.#srcEx;
        const isMessageFromST = event.origin === this.#srcSt;
        const isMessageFromHandleFile = event.origin === this.#srcHandleFile;
        if (command === "progress") {
          if (data == 100) {
            if (isMessageFromST) {
              this.isSTLoaded = true;
              this.executeFrame = this.#createFrame({
                id: "fin_execute",
                src: `${this.#srcEx}/index.html`,
                onProgress,
                onFinish,
                onError,
              });
            }
            if (isMessageFromEx) {
              this.isEXLoaded = true;
              this.commerceFrame = this.#createFrame({
                id: "fin_commerce",
                src: `${this.#srcHandleFile}`,
                onProgress,
                onFinish,
                onError,
              });
            }
            if (isMessageFromHandleFile) {
              this.isHandleFileLoaded = true;
            }

            if (this.isSTLoaded && this.isEXLoaded) {
              onProgress(100);
              onFinish();
            } else {
              this.progressPercent += 33.33;
              onProgress(this.progressPercent);
            }
          }
          return;
        }
        if (command === "error") {
          console.log("hoan quan hoa", onError);
          onError(data);
          return;
        }
        if (
          (command === "getBls" ||
            command === "getWalletInfo" ||
            command === "requireSerectKey" ||
            command === "updateWalletInfo") &&
          isMessageFromEx
        ) {
          console.log("Exxx call", command);
          const res = await this.#send({
            iframeName: "st",
            message: {
              command,
              data,
            },
            option: {
              timeout: 1000 * 60,
            },
          });
          console.log(
            `Exxx call ${command} -> result ${Object.keys(res).length}`
          );
          this.#send({
            iframeName: "ex",
            message: {
              command,
              data: res,
            },
            isWaitingResponse: false,
          });
          return;
        }

        if (command === "fetchLink") {
          var { url, content } = data.data;
          this.#listLink[url] = content;
        }
        if (command == "requestSerectKey") {
          const { status } = data;
          if (status == 0) {
            this.showQrCode(data.key);
            return;
          }
          if (typeof this.#onRequestSecrectKey === "function") {
            this.#onRequestSecrectKey({
              success: true,
              message: "request secrect key",
            });
            return;
          }
          this.showSelectSerectKey();
          return;
        }
        this.#listCommand[command] = data;
      });
    }
    #createFrame({ id, src, onFinish }) {
      this.timeOutLoadIframe[id] = setTimeout(() => {}, 5000);
      const newIframe = document.createElement("iframe");
      newIframe.style = "display: none";
      newIframe.src = src;
      newIframe.id = id;
      const body = document.body;
      body.appendChild(newIframe);

      return newIframe;
    }
    async createHash(value) {
      if (typeof value !== "string" || value.length === 0) {
        return "Value invalid";
      }
      const res = await this.#send({
        iframeName: "st",
        message: {
          command: "createHash",
          data: value,
        },
      });
      return res;
    }
    async getSeed(language) {
      const res = await this.#send({
        iframeName: "st",
        message: {
          command: "getSeed",
          data: {
            language,
          },
        },
      });
      return res;
    }
    async verifyQr(code) {
      const qrcode = document.getElementById("qrcode");
      qrcode.innerHTML = "";
      var labelDescription = document.createElement("span");
      labelDescription.className = "label";
      var tryAgain = document.createElement("button");
      tryAgain.className = "upload-btn";
      tryAgain.innerHTML = "Try Again";
      tryAgain.onclick = function () {
        fileInput.click();
      };
      var fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      fileInput.onchange = (event) => {
        this.readQRCodeFromFile(event.target.files[0]);
      };
      const elementsList = [labelDescription];
      if (!code || !code.data) {
        labelDescription.innerText = "Not found qr in this image";
        labelDescription.className += " errorText";
        elementsList.push(fileInput);
        elementsList.push(tryAgain);
      } else if (code.data !== this.keyVerify) {
        labelDescription.innerText = "Verify fail. Please select other image";
        labelDescription.className += " errorText";
        elementsList.push(fileInput);
        elementsList.push(tryAgain);
      } else {
        console.log("code.data", code.data);
        const res = await this.#send({
          iframeName: "st",
          message: {
            command: "saveSerectKey",
            data: {
              third: code.data,
            },
          },
        });
        if (!res.success) {
          labelDescription.innerText = "Verify fail. Key not match";
          labelDescription.className += " errorText";
          elementsList.push(fileInput);
          elementsList.push(tryAgain);
        } else {
          labelDescription.innerText = "Verify SuCCESS";
          labelDescription.className += " successText";
          var closeButon = document.createElement("button");
          closeButon.className = "upload-btn";
          closeButon.innerHTML = "Done";
          closeButon.onclick = function () {
            document.getElementById("qrcodeModal").remove();
          };
          elementsList.push(closeButon);
          this.#send({
            iframeName: "st",
            message: {
              command: "requestSerectKey",
              data: {
                success: true,
              },
            },
            isWaitingResponse: false,
          });
        }
      }
      elementsList.map((v) => {
        qrcode.appendChild(v);
      });
    }
    readQRCodeFromFile(file) {
      var reader = new FileReader();
      reader.onload = (event) => {
        var img = new Image();
        img.onload = async () => {
          var canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          var context = canvas.getContext("2d");
          context.drawImage(img, 0, 0);
          var imageData = context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height
          );
          var code = jsQR(imageData.data, canvas.width, canvas.height);
          if (this.keyVerify) {
            this.verifyQr(code);
          } else if (this.isFillKey) {
            this.#send({
              iframeName: "st",
              message: {
                command: "requestSerectKey",
                data: {
                  key: code.data,
                },
              },
              isWaitingResponse: false,
            });
            this.closeModal();
          }
        };
        img.src = event.target.result;
      };
      reader.readAsDataURL(file);
    }

    saveQRCode() {
      var qrCodeCanvas = document.querySelector("#qrcode canvas");
      if (qrCodeCanvas) {
        var link = document.createElement("a");
        link.href = qrCodeCanvas.toDataURL("image/png");
        const time = new Date().getTime();
        link.download = `serect_key_${time}.png`;
        link.click();
        setTimeout(() => {
          const qrcode = document.getElementById("qrcode");
          qrcode.innerHTML = "";
          var fileInput = document.createElement("input");
          fileInput.type = "file";
          fileInput.accept = "image/*";
          fileInput.style.display = "none";
          fileInput.onchange = (event) => {
            this.readQRCodeFromFile(event.target.files[0]);
          };

          // Create upload button
          var uploadBtn = document.createElement("button");
          uploadBtn.className = "upload-btn";
          uploadBtn.innerHTML = "Select file";
          uploadBtn.onclick = function () {
            fileInput.click();
          };
          var titleQr = document.createElement("span");
          titleQr.className = "title";
          titleQr.innerText = "Select your serect key to verify";
          qrcode.appendChild(titleQr);

          qrcode.appendChild(uploadBtn);
          qrcode.appendChild(fileInput);
        }, 3000);
      }
    }

    createModal(option = {}) {
      const oldModal = document.getElementById("qrcodeModal");
      if (oldModal) {
        oldModal.remove();
      }
      const { isHasClose = true } = option;
      var modal = document.createElement("div");
      modal.id = "qrcodeModal";
      modal.className = "modal";

      var modalContent = document.createElement("div");
      modalContent.className = "modal-content";

      if (isHasClose) {
        window.onclick = function (event) {
          if (event.target == modal) {
            modal.style.display = "none";
            document.getElementById("qrcodeModal").remove();
            this.keyVerify = "";
          }
        };
      }
      return {
        modal,
        modalContent,
      };
    }
    closeModal() {
      console.log("close ---->");
      const modal = document.getElementById("qrcodeModal");
      modal.style.display = "none";
      modal.remove();
      this.keyVerify = "";
      this.isFillKey = false;
    }
    createSelectImgInput(elm, isHasClose = true) {
      elm.innerHTML = "";
      var fileInput = document.createElement("input");
      fileInput.type = "file";
      fileInput.accept = "image/*";
      fileInput.style.display = "none";
      fileInput.onchange = (event) => {
        this.readQRCodeFromFile(event.target.files[0]);
      };
      // Create upload button
      var uploadBtn = document.createElement("button");
      uploadBtn.className = "upload-btn";
      uploadBtn.innerHTML = "Select file";
      uploadBtn.onclick = function () {
        fileInput.click();
      };
      var titleQr = document.createElement("span");
      titleQr.className = "title";
      titleQr.innerText = "Select your serect key to verify";
      if (isHasClose) {
        var closeBtn = document.createElement("span");
        closeBtn.className = "close";
        closeBtn.innerHTML = "&times;";
        closeBtn.onclick = () => {
          this.closeModal();
        };
        elm.appendChild(closeBtn);
      }

      elm.appendChild(titleQr);
      elm.appendChild(uploadBtn);
      elm.appendChild(fileInput);
    }
    showSelectSerectKey() {
      const { modal, modalContent } = this.createModal({
        isHasClose: false,
      });
      this.createSelectImgInput(modalContent, false);
      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      this.isFillKey = true;
    }
    showQrCode(keyString) {
      this.keyVerify = keyString;
      const { modal, modalContent } = this.createModal();
      // Create QR code container
      var qrCodeContainer = document.createElement("div");
      qrCodeContainer.id = "qrcode";
      qrCodeContainer.className = "col alignCenter justifyCenter ";

      var closeBtn = document.createElement("span");
      closeBtn.className = "close";
      closeBtn.innerHTML = "&times;";
      closeBtn.onclick = () => {
        this.closeModal();
      };
      modalContent.appendChild(closeBtn);
      var titleQr = document.createElement("span");
      titleQr.className = "title mb2";
      titleQr.innerText = "Your serect key";
      qrCodeContainer.appendChild(titleQr);

      new QRCode(qrCodeContainer, {
        text: keyString,
        width: 128,
        height: 128,
      });

      var labelQR = document.createElement("span");
      labelQR.className = "label mt2";
      labelQR.innerText = "Save this image to local";
      qrCodeContainer.appendChild(labelQR);

      var saveBtn = document.createElement("button");
      saveBtn.className = "save-btn";
      saveBtn.innerHTML = "Save QR Code";
      saveBtn.onclick = () => {
        this.saveQRCode();
      };
      qrCodeContainer.appendChild(saveBtn);

      // Append elements to modal content
      modalContent.appendChild(qrCodeContainer);

      // Append modal content to modal
      modal.appendChild(modalContent);
      // Append modal to body
      document.body.appendChild(modal);
    }
    async createWallet(mapData = {}) {
      const res = await this.#send({
        iframeName: "st",
        message: {
          command: "createWallet",
          data: {
            seed: mapData.data,
          },
        },
        option: {
          timeout: 1000 * 60,
        },
      });
      return res;
    }
    async createWalletFromPrivateKey(privateKey) {
      const res = await this.#send({
        iframeName: "st",
        message: {
          command: "createWalletFromPrivateKey",
          data: {
            privateKey: privateKey,
          },
        },
        option: {
          timeout: 1000 * 60,
        },
      });
      return res;
    }
    async #downloadScript({ url, name, contentLength }) {
      var writeFile = async (fileHandle, content) => {
        try {
          var writable = await fileHandle.createWritable();
          var writer = await writable.getWriter();
          await writer.write(content);
          await writer.close();
        } catch (error) {
          console.error("Error writeFile:", error);
        }
      };
      var loopFile = async (pathArray, cb, parent = null) => {
        try {
          // Initialize the parent directory if not provided
          parent = parent || (await navigator.storage.getDirectory());
          var name = pathArray[0];

          // If the name is empty, call the callback with false and return
          if (!name) return cb(false);

          // Determine if the current item is a file based on the presence of a dot in its name
          var isFile = name.includes(".");

          // Get the appropriate handle (file or directory)
          var current = isFile
            ? await parent.getFileHandle(name, { create: true })
            : await parent.getDirectoryHandle(name, { create: true });

          // If this is the last item in the pathArray, call the callback with the current handle
          if (pathArray.length === 1) {
            return cb(current);
          }

          // If the current item is not a file, recursively call loopFile with the rest of the pathArray
          if (!isFile) {
            return loopFile(pathArray.slice(1), cb, current);
          }

          // If the pathArray still has items but the current item is a file, call the callback with false
          return cb(false);
        } catch (error) {
          console.error("Error loopFile:", error);
        }
      };
      var getMyFile = async (path) => {
        var fileName = path.split("/");
        fileName = fileName[fileName.length - 1];
        return await (await getPath(path)).getFile?.(fileName);
      };
      var getPath = async (path) => {
        var pathArray = path.split("/");
        return await new Promise((res, rej) => loopFile(pathArray, res));
      };
      try {
        var fileContent = await getMyFile(name);
        var content = await fileContent.text();
        if (!content) {
          const fileHandle = await (
            await navigator.storage.getDirectory()
          ).getFileHandle(name, {
            create: true,
          });
          const data = await this.fetchAPIAndUpdateProgress({
            url: url,
            contentLength: contentLength,
          });
          writeFile(fileHandle, new TextEncoder().encode(data));
          content = data;
        }
        return content;
      } catch (error) {
        console.log("error = ", error);
      }
    }
    async fetchAPIAndUpdateProgress({ url, contentLength }) {
      try {
        const result = await this.saveOrOpenBlob(url, (current, total) => {});
        return result;
      } catch (error) {
        console.log("fetchAPIAndUpdateProgress error", error);
      }
    }
    async saveOrOpenBlob(url, onProgress, responseType = "text") {
      return new Promise((resolve, reject) => {
        let response;
        const xmlHTTP = new XMLHttpRequest();
        xmlHTTP.open("GET", url, true);
        xmlHTTP.responseType = responseType;

        xmlHTTP.onerror = function (e) {
          console.error("Request failed", url, e);
          reject(e);
        };

        xmlHTTP.onload = function () {
          if (xmlHTTP.status >= 200 && xmlHTTP.status < 300) {
            if (responseType === "arraybuffer") {
              // Create a Blob if responseType is arraybuffer
              const blob = new Blob([xmlHTTP.response]);
              response = blob;
            } else {
              response = xmlHTTP.response;
            }
          } else {
            reject(new Error(`HTTP status ${xmlHTTP.status}`));
          }
        };

        xmlHTTP.onprogress = function (pr) {
          if (pr.lengthComputable) {
            onProgress(pr.loaded, pr.total);
          } else {
            onProgress(pr.loaded, 0); // Total size unknown
          }
        };

        xmlHTTP.onloadend = function () {
          if (xmlHTTP.status >= 200 && xmlHTTP.status < 300) {
            resolve(response);
          } else {
            reject(new Error(`HTTP status ${xmlHTTP.status}`));
          }
        };
        xmlHTTP.ontimeout = function () {
          console.log("request time out");
        };
        xmlHTTP.send();
      });
    }
    getWalletActive = async () => {
      const res = await this.#send({
        iframeName: "ex",
        message: {
          command: "getWalletActive",
          data: {
            domain: window.location.hostname,
          },
        },
        option: {
          timeout: 90 * 1000,
        },
      });
      if (res.success && res.data) {
        this.#walletSelected = res.data;
      }
      return res;
    };
    getWalletByAddress = async (address) => {
      console.log("walletInfo --> 0", address);
      const walletInfo = await this.#send({
        iframeName: "st",
        message: {
          command: "getWalletInfo",
          data: {
            address,
          },
        },
      });
      console.log("walletInfo --> 1", walletInfo);
      return walletInfo;
    };
    createContentConnect = async (elements) => {
      const allWallet = await this.#send({
        iframeName: "st",
        message: {
          command: "getAllWallets",
        },
      });
      console.log("allWallet = ", allWallet);
      let walletItems;
      if (allWallet && allWallet.data && allWallet.data.length > 0) {
        for (const index in allWallet.data) {
          const address = allWallet.data[index];
          walletItems += `
          <div class="walletItem row alignCenter between mb2" id="wallet-${address}">
            <div>
              <span>${address}</span>
            </div>
          </div>
        `;
        }
      } else {
        walletItems = `
        <div class="mb2 mt2">
          <span>List walletes empty</span>
        </div
      `;
      }
      const content = `
      <div class="connectWallet">
        <div class="header">
          <span class="title">List wallet</span>
        </div>
        <div class="content col">
        ${walletItems}
        </div>
        <div class="bottom col">
          <div class="row between">
            <button id="btn-import-wallet">
              <span>Import wallet</span>
            </button>
            <div id="btn-create-wallet">
              <span>Create wallet</span>
            </div>
          </div>
          <div class="row spaceAround mt2">
            <button id="btn-closeModal">Close</button>
            <button id="btn-submit">Done</button>
          </div>
        </div>
      </div>
    `;
      elements.innerHTML = content;

      document.getElementById("btn-closeModal").onclick = () => {
        if (typeof this.#callbackConnectWallet === "function") {
          this.#callbackConnectWallet({
            success: false,
            message: "user cancel",
          });
          this.#callbackConnectWallet = null;
        }
        this.closeModal();
      };
      document.getElementById("btn-submit").onclick = async () => {
        if (!this.#walletSelected) {
          alert("please select wallet");
          return;
        }
        const res = await this.#send({
          iframeName: "ex",
          message: {
            command: "setWalletActive",
            data: {
              domain: window.location.hostname,
              address: this.#walletSelected,
            },
          },
        });
        if (typeof this.#callbackConnectWallet === "function") {
          this.#callbackConnectWallet({
            success: true,
            data: {
              address: this.#walletSelected,
            },
          });
          this.#callbackConnectWallet = null;
        }
        this.closeModal();
        return res;
      };
      document.getElementById("btn-create-wallet").onclick = async () => {
        this.closeModal();
        const seedData = await this.getSeed();
        const walletInfo = await this.createWallet(seedData);
        if (!walletInfo.success) {
          alert(walletInfo.message);
          return;
        }
        this.connectWallet();
      };
    };
    connectWallet = async (cb) => {
      console.log("connectWallet-1", cb, typeof cb);
      const { modal, modalContent } = this.createModal();
      this.createContentConnect(modalContent);
      setTimeout(() => {
        const elements = document.querySelectorAll('[id^="wallet-"]');
        console.log("elements -->", elements);
        elements.forEach((element) => {
          element.onclick = () => {
            console.log("ele", element.id);
            this.#walletSelected = element.id.substring(
              element.id.lastIndexOf("-") + 1
            );
          };
        });
      }, 300);

      modal.appendChild(modalContent);
      document.body.appendChild(modal);
      if (cb) {
        console.log("Set cb");
        this.#callbackConnectWallet = cb;
      }
    };
    sendTransaction = async (data) => {
      const waitSendTransaction = async () => {
        return await new Promise((resolve, reject) => {
          var interval = setInterval(() => {
            if (!this.#isSendingTransaction) {
              clearInterval(interval);
              resolve(true);
            }
          }, 100);
        });
      };

      if (this.#isSendingTransaction) {
        await waitSendTransaction();
      }
      this.#isSendingTransaction = true;
      const res = await this.#send({
        iframeName: "ex",
        message: {
          command: "sendTransaction",
          data: {
            ...data,
            domain: window.location.hostname,
            from: this.#walletSelected,
          },
        },

        option: {
          timeout: 1000 * 60,
        },
      });
      this.#isSendingTransaction = false;
      return res;
    };
    getLastHash = async (data) => {
      const res = await this.#send({
        iframeName: "ex",
        message: {
          command: "getLastHash",
          data,
        },
      });
      return res;
    };
    sign = async (data) => {
      const res = await this.#send({
        iframeName: "ex",
        message: {
          command: "sign",
          data,
        },
      });
      return res;
    };

    connectWalletV2 = async (address) => {
      return await this.#send({
        iframeName: "ex",
        message: {
          command: "setWalletActive",
          data: {
            domain: window.location.hostname,
            address,
          },
        },
      });
    };

    async postMessageToFrame({ command, data, frame = "commerce" }) {
      const res = await this.#send({
        iframeName: frame,
        message: {
          command,
          data,
        },
      });
      return res;
    }

    requestSerectKey = async (key) => {
      return await this.#send({
        iframeName: "st",
        message: {
          command: "requestSerectKey",
          data: {
            key,
          },
        },
        isWaitingResponse: false,
      });
    };
  }
  window.finSdk = new FinSdk();
};

initFinSdk();
