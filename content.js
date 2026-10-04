const runtime =
  typeof browser === "undefined" ? chrome.runtime : browser.runtime;

// !!!!!!!!!!!        spriteAnimation         !!!!!!!!!!!!!!!!!;
const frameDiv = document.createElement("div");
frameDiv.style.width = "128px";
frameDiv.style.height = "128px";
frameDiv.style.position = "fixed";
frameDiv.style.display = "none";
frameDiv.style.backgroundImage = `url(${runtime.getURL(
  "/images/chesta256.png",
)})`;
frameDiv.style.backgroundRepeat = "no-repeat";
frameDiv.style.backgroundPositionX = "-64px";
frameDiv.style.backgroundPositionY = "-64px";
frameDiv.style.zIndex = "999";
(document.body || document.documentElement).append(frameDiv);

window.addEventListener("message", (e) => {
  console.log("message recieved", e);
  if (e.origin !== "http://bokmarke.world") {
    return;
  }
  if (e.origin !== "https://bokmarke.world") {
    return;
  }
  if (e.data?.type !== "set_tags") {
    return;
  }
  const runtime =
    typeof browser === "undefined" ? chrome.runtime : browser.runtime;

  runtime
    .sendMessage({
      action: "SetTags",
      tagData: {
        ac_tags: e.data.ac_tag,
        dr_tags: e.data.dr_tag,
      },
    })
    .catch(() => {});
});

function showSessionExpiredPopup() {
  if (document.getElementById("inshare-session-expired")) {
    return;
  }
  const popup = document.createElement("div");
  popup.id = "inshare-session-expired";
  popup.textContent = "your bookmark session expired please sign in again";
  popup.style.position = "fixed";
  popup.style.top = "24px";
  popup.style.left = "50%";
  popup.style.transform = "translateX(-50%)";
  popup.style.zIndex = "2147483647";
  popup.style.background = "#111";
  popup.style.color = "#fff";
  popup.style.padding = "14px 22px";
  popup.style.borderRadius = "10px";
  popup.style.fontFamily = "system-ui, sans-serif";
  popup.style.fontSize = "14px";
  popup.style.boxShadow = "0 4px 18px rgba(0,0,0,.5)";
  popup.style.cursor = "pointer";
  popup.addEventListener("click", () => popup.remove());
  (document.body || document.documentElement).append(popup);
  setTimeout(() => popup.remove(), 6000);
}

runtime.onMessage.addListener((message) => {
  if (message.action === "SessionExpired") {
    showSessionExpiredPopup();
  }
});

//############## variable ####################3

let elememt = null;

const WinWidth = window.screen.width;

function findNearestImg(elememt) {
  let parent = elememt.parentElement;
  while (parent) {
    const img = parent.querySelector("img");

    if (img) {
      return img;
    }
    parent = parent.parentElement;
  }
  return null;
}
function findNearestAnc(elememt) {
  let parent = elememt.parentElement;
  while (parent) {
    const anchor = parent.querySelector("a");

    if (anchor) {
      return anchor;
    }
    parent = parent.parentElement;
  }
  return null;
}

function LinknImg(elememt) {
  switch (elememt.tagName) {
    case "IMG": {
      let anc = findNearestAnc(elememt);
      return { img: elememt, anc: anc };
    }
    case "A": {
      let img = findNearestImg(elememt);
      return { img: img, anc: elememt };
    }

    default: {
      let img = findNearestImg(elememt);
      let anc = findNearestAnc(elememt);
      return { img: img, anc: anc };
    }
  }
}

function MousePos(xcor) {
  let requireWid = 9 * (WinWidth / 10);
  if (xcor > requireWid) {
    return xcor - 175;
  } else {
    return xcor + 100;
  }
}

let isChestActive = false;

function animateChest(xcor, ycor) {
  let dx = frameX - xcor;
  let dy = ycor - frameY;

  if (dx < 0 && dx > -96 && dy > 32 && dy < 128) {
    frameDiv.style.backgroundPositionX = "-1344px";
  } else {
    frameDiv.style.backgroundPositionX = "-64px";
  }
}

let icon = null;
let timeout;
let frameX;
let frameY;
document.addEventListener("dragstart", (e) => {
  // Firefox requires drag data to be set during dragstart, otherwise
  // subsequent drag/dragend events never fire.
  if (e.dataTransfer) {
    e.dataTransfer.setData(
      "text/plain",
      e.target?.src || e.target?.href || "inshare",
    );
  }
  isChestActive = true;
  frameX = MousePos(e.clientX);
  frameY = e.clientY - 128;
  frameDiv.style.top = `${frameY}px`;
  frameDiv.style.left = `${frameX}px`;
  frameDiv.style.display = "flex";
  timeout = setTimeout(() => {
    frameDiv.style.display = "none";
  }, 3500);
  elememt = e.target;
});

let chestClose;
document.addEventListener("dragend", (e) => {
  isChestActive = false;
  frameDiv.style.backgroundPositionX = "-64px";
  chestClose = setTimeout(() => {
    frameDiv.style.display = "none";
  }, 200);
  clearTimeout(timeout);
});
document.addEventListener("dragover", (e) => {
  e.preventDefault();
  // Firefox reports clientX/clientY as 0 on "drag" events (bug 505521),
  // so the open/close state is driven by "dragover" which has valid coords.
  if (!isChestActive) {
    return;
  }
  animateChest(e.clientX, e.clientY);
});

document.addEventListener("drop", (e) => {
  if (
    e.clientX >= frameX &&
    e.clientX <= frameX + 100 &&
    e.clientY >= frameY + 28 &&
    e.clientY <= frameY + 128
  ) {
    const { img, anc } = LinknImg(elememt);
    if (!img || !anc) {
      clearTimeout(chestClose);
      return;
    }
    runtime
      .sendMessage({
        action: "PostServer",
        bokmarkeData: {
          userBokmarke: {
            image: img.src,
            link: anc.href,
            hostName: `${window.location.hostname}`,
          },
        },
      })
      .catch(() => {});
  } else {
  }

  clearTimeout(chestClose);
});
