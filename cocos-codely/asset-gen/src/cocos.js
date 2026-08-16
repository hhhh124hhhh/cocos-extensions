'use strict';
// Cocos Creator 资源落盘：写 PNG/JPEG + 手写 .meta（含 sprite-frame subMeta）。
// 让 dsh 面板生成的图能被 Cocos 直接识别/导入，返回 spriteFrame uuid 供场景接线。
// 注：火山方舟 seedream 仅返回 JPEG（无透明通道），故需支持 jpg 落盘；
//     透明背景精灵需后续加去背（rembg）或换支持透明的模型（见 backlog）。

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function uuidHex() {
  return crypto.randomUUID().replace(/-/g, '');
}

// 读图片宽高：PNG 走 IHDR（offset 16），JPEG 走 SOF marker 扫描。
function imageSize(buf) {
  if (buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47) {
    if (buf.length < 24) throw new Error('PNG 文件过短');
    return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  }
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return jpegSize(buf);
  }
  throw new Error('非 PNG/JPEG 文件，无法读取尺寸');
}

// 读 JPEG SOF marker 取宽高（方舟 seedream 返回 JPEG，无透明通道）。
function jpegSize(buf) {
  let i = 2; // 跳过 FFD8
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const m = buf[i + 1];
    // SOF0/1/2/3/5/6/7/9/10/11/13/14/15 含尺寸；跳过 DHT(0xC4)/DAC(0xC8)/DRI(0xCC)
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      const h = buf.readUInt16BE(i + 5);
      const w = buf.readUInt16BE(i + 7);
      return [w, h];
    }
    const len = buf.readUInt16BE(i + 2);
    if (len <= 0) throw new Error('JPEG 尺寸解析失败');
    i += 2 + len;
  }
  throw new Error('JPEG 尺寸解析失败');
}

function spriteMeta({ uuid, w, h, name }) {
  return {
    ver: '2.2.0',
    uuid,
    type: 'texture',
    wrapMode: 'clamp',
    filterMode: 'bilinear',
    premultiplyAlpha: false,
    packable: true,
    subMetas: {
      [name]: {
        uuid: `${uuid}@f9941`,
        type: 'sprite-frame',
        wrapMode: 'clamp',
        filterMode: 'bilinear',
        premultiplyAlpha: false,
      },
    },
    maxTextureSize: '2048',
    imageWidth: w,
    imageHeight: h,
  };
}

// targetDir: 落盘目录（绝对或相对）；fileBase: 文件名（不含扩展）；buf: 图片二进制（PNG 或 JPEG）。
// 返回 { pngPath, metaPath, uuid, spriteFrameUuid, width, height }
function writeAsset(targetDir, fileBase, buf) {
  fs.mkdirSync(targetDir, { recursive: true });
  const [w, h] = imageSize(buf);
  const uuid = uuidHex();
  const isPng = buf.length >= 8 && buf.readUInt32BE(0) === 0x89504e47;
  const ext = isPng ? 'png' : 'jpg';
  const imgPath = path.join(targetDir, `${fileBase}.${ext}`);
  const metaPath = path.join(targetDir, `${fileBase}.${ext}.meta`);
  fs.writeFileSync(imgPath, buf);
  fs.writeFileSync(metaPath, JSON.stringify(spriteMeta({ uuid, w, h, name: fileBase }), null, 2));
  return {
    pngPath: imgPath,
    metaPath,
    uuid,
    spriteFrameUuid: `${uuid}@f9941`,
    width: w,
    height: h,
  };
}

module.exports = { writeAsset, imageSize };
