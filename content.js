//############## popup menu for droping ###############
const dropbody = document.createElement("div");
dropbody.contains;
dropbody.style.position = "fixed";

dropbody.style.backgroundColor = "black";
dropbody.style.height = "125px";
dropbody.style.width = "125px";
dropbody.style.borderRadius = "10px";
dropbody.style.display = "none";
dropbody.style.justifyContent = "center";
dropbody.style.alignContent = "center";
dropbody.style.zIndex = "999";

//########## background and styling ############
const runtime =
  typeof browser === "undefined" ? chrome.runtime : browser.runtime;
const cloudopng = document.createElement("img");
cloudopng.src = runtime.getURL("/images/Space.png");
cloudopng.style.objectFit = "contain";
cloudopng.style.borderRadius = "12px";
dropbody.appendChild(cloudopng);
document.body.appendChild(dropbody);
// ######### Setting Tags ###########

window.addEventListener("message", (e) => {
  console.log("message recieved", e);
  if (e.origin !== "http://localhost:5173") {
    return;
  }
  if (e.data?.type !== "set_tags") {
    return;
  }
  const runtime =
    typeof browser === "undefined" ? chrome.runtime : browser.runtime;

  runtime.sendMessage({
    action: "SetTags",
    tagData: {
      ac_tags: e.data.ac_tag,
      dr_tags: e.data.dr_tag,
    },
  });
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
  let requireWid = 4 * (WinWidth / 5);
  if (xcor > requireWid) {
    return xcor - 175;
  } else {
    return xcor + 50;
  }
}

let icon = null;

document.addEventListener("dragstart", (e) => {
  let leftpos = MousePos(e.clientX);
  console.log(leftpos);
  dropbody.style.top = `${e.clientY - 50}px`;
  dropbody.style.left = `${leftpos}px`;
  dropbody.style.display = "flex";
  elememt = e.target;
  console.log(elememt);
  console.log(window.location.href);
});

document.addEventListener("dragend", (e) => {
  dropbody.style.display = "none";
});
document.addEventListener("dragover", (e) => {
  e.preventDefault();
});

document.addEventListener("drop", (e) => {
  const { img, anc } = LinknImg(elememt);
  console.log(img);
  console.log(anc);
  console.log(icon);
  const runtime =
    typeof browser === "undefined" ? chrome.runtime : browser.runtime;
  runtime.sendMessage({
    action: "PostServer",
    bokmarkeData: {
      userBokmarke: {
        image: img.src,
        link: anc.href,
        hostName: `${window.location.hostname}`,
      },
    },
  });
});
