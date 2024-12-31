/****************************************************************************
 Copyright (c) 2018 Xiamen Yaji Software Co., Ltd.

 https://www.cocos.com/

 Permission is hereby granted, free of charge, to any person obtaining a copy
 of this software and associated engine source code (the "Software"), a limited,
 worldwide, royalty-free, non-assignable, revocable and non-exclusive license
 to use Cocos Creator solely to develop games on your target platforms. You shall
 not use Cocos Creator software for developing other software or tools that's
 used for developing games. You are not granted to publish, distribute,
 sublicense, and/or sell copies of Cocos Creator.

 The software or tools in this License Agreement are licensed, not sold.
 Xiamen Yaji Software Co., Ltd. reserves all rights not expressly granted to you.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 THE SOFTWARE.
 ****************************************************************************/

import WebglBmfontAssembler from '../../webgl/assemblers/label/2d/bmfont';

const Label = require('../../../components/CCLabel');
const LabelOutline = require('../../../components/CCLabelOutline');
const textUtils = require('../../../utils/text-utils');
const Component = require('../../../components/CCComponent');
const RenderTexture = require('../../../assets/CCRenderTexture');
const OUTLINE_SUPPORTED = cc.js.isChildClassOf(LabelOutline, Component);
const getFontFamily = require('../utils').getFontFamily;
const shareLabelInfo = require('../utils').shareLabelInfo;


const FontLetterDefinition = cc.BitmapFont.FontLetterDefinition;
const FontAtlas = cc.BitmapFont.FontAtlas;

const WHITE = cc.Color.WHITE;
const space = 0;
const bleed = 2;
const _invisibleAlpha = (1 / 255).toFixed(3);
let _unsedLetterList = {}; // �ɱ��滻�����塣
let _unsedLetterCalMap = {};//�Ż��㷨
let _unsedLetterCount = 0;
let _debugNode = null;

function LetterTexture(char, labelInfo) {
    this._texture = null;
    this._labelInfo = labelInfo;
    this._char = char;
    this._hash = null;
    this._data = null;
    this._canvas = null;
    this._context = null;
    this._width = 0;
    this._height = 0;
    this._offsetY = 0;
    this._hash = char.charCodeAt(0) + labelInfo.hash;
}

LetterTexture.prototype = {
    constructor: LetterTexture,

    updateRenderData() {
        this._updateProperties();
        this._updateTexture();
    },
    _updateProperties() {
        this._texture = new cc.Texture2D();
        this._data = Label._canvasPool.get();
        this._canvas = this._data.canvas;
        this._context = this._data.context;
        this._context.font = this._labelInfo.fontDesc;
        let width = textUtils.safeMeasureText(this._context, this._char, this._labelInfo.fontDesc);
        let blank = this._labelInfo.margin * 2 + bleed;
        this._width = parseFloat(width.toFixed(2)) + blank;
        this._height = (1 + textUtils.BASELINE_RATIO) * this._labelInfo.fontSize + blank;
        this._offsetY = - (this._labelInfo.fontSize * textUtils.BASELINE_RATIO) / 2;
        if (this._canvas.width !== this._width) {
            this._canvas.width = this._width;
        }
        if (this._canvas.height !== this._height) {
            this._canvas.height = this._height;
        }

        this._texture.initWithElement(this._canvas);
    },
    _updateTexture() {
        let context = this._context;
        let labelInfo = this._labelInfo,
            width = this._canvas.width,
            height = this._canvas.height;

        const fontSize = this._labelInfo.fontSize;
        let startX = width / 2;
        let startY = height / 2 + fontSize * textUtils.MIDDLE_RATIO + fontSize * textUtils.BASELINE_OFFSET;
        let color = labelInfo.color;

        // use round for line join to avoid sharp intersect point
        context.lineJoin = 'round';
        context.textAlign = 'center';
        context.clearRect(0, 0, width, height);
        //Add a white background to avoid black edges.
        context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${_invisibleAlpha})`;
        context.fillRect(0, 0, width, height);
        context.font = labelInfo.fontDesc;

        context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, 1)`;
        if (labelInfo.isOutlined && labelInfo.margin > 0) {
            let strokeColor = labelInfo.out || WHITE;
            context.strokeStyle = `rgba(${strokeColor.r}, ${strokeColor.g}, ${strokeColor.b}, 1)`;
            context.lineWidth = labelInfo.margin * 2;
            context.strokeText(this._char, startX, startY);
        }
        // } else {
        //     var strokeColor = color;
        //     context.strokeStyle = "rgba(" + strokeColor.r + ", " + strokeColor.g + ", " + strokeColor.b + ", " + 0.01 + ")";
        //     context.lineWidth = 2;
        //     context.strokeText(this._char, startX, startY);
        // }
        context.fillText(this._char, startX, startY);

        this._texture.handleLoadedTexture();
    },

    destroy() {
        this._texture.destroy();
        this._texture = null;
        Label._canvasPool.put(this._data);
    },
}
LetterTexture.calcTextSize = (labelInfo, char) => {
    let data = Label._canvasPool.get();
    let context = data.context;
    context.font = labelInfo.fontDesc;
    let width = textUtils.safeMeasureText(context, char, labelInfo.fontDesc);
    let blank = labelInfo.margin * 2 + bleed;
    width = parseFloat(width.toFixed(2)) + blank;
    let height = (1 + textUtils.BASELINE_RATIO) * labelInfo.fontSize + blank;
    return [width, height];
};
function LetterAtlas(width, height) {
    let texture = new RenderTexture();
    //width = 1334, height = 750;
    texture.initWithSize(width, height);
    texture.update();

    this._fontDefDictionary = new FontAtlas(texture);

    this._x = space;
    this._y = space;
    this._nexty = space;
    //30作为字体大小，描边为3；
    this._lFontSize = 46;// (46-8)/1.6=30 有描边字体大小最大为30字号，描边 3； 无描边的字体大小为36
    this._lx = space;
    this._ly = space;
    this._lnexty = space;
    this._lHeight = 1656; // 小字尺寸区域
    //以50 作为字体大小，描边为3
    this._bFontSize = 72;
    this._bx = 0;
    this._by = 1656;//算出来的。
    this._bnexty = 0;
    this._width = width;
    this._height = height;
    this._safeHeight = 2048;

    cc.director.on(cc.Director.EVENT_BEFORE_SCENE_LAUNCH, this.beforeSceneLoad, this);
}

cc.js.mixin(LetterAtlas.prototype, {
    insertLetterTexture(letterTexture) {
        let texture = letterTexture._texture;
        let width = texture.width, height = texture.height;
        let isLFontFlag = true;
        let areaHeight = this._height;
        if (width > this._lFontSize || height > this._lFontSize) {//分为大字体 64x64

            if (width > this._bFontSize) {
                this._bFontSize = width;
                console.error("===============Reset bFontSize" + this._bFontSize + " " + letterTexture._char + " ================= width"); //
            }
            if (height > this._bFontSize) {
                this._bFontSize = height;
                console.error("===============Reset bFontSize" + this._bFontSize + " " + letterTexture._char + " ================= height"); //
            }
            width = this._bFontSize;
            height = this._bFontSize;
            isLFontFlag = false;
            this._x = this._bx;
            this._y = this._by;
            this._nexty = this._bnexty;

        } else {
            width = this._lFontSize;
            height = this._lFontSize;
            this._x = this._lx;
            this._y = this._ly;
            this._nexty = this._lnexty;
            areaHeight = this._lHeight;
        }

        if ((this._x + width + space) > this._width) {
            this._x = space;
            this._y = this._nexty;
        }

        if ((this._y + height) > this._nexty) {
            this._nexty = this._y + height + space;
        }

        if (this._nexty > areaHeight) {
            return null;
        }

        this._fontDefDictionary._texture.drawTextureAt(texture, this._x, this._y);

        this._dirty = true;

        let letter = new FontLetterDefinition();
        letter.u = this._x + bleed / 2;
        letter.v = this._y + bleed / 2;
        letter.texture = this._fontDefDictionary._texture;
        letter.valid = true;
        letter.w = letterTexture._width - bleed;
        letter.h = letterTexture._height - bleed;
        letter.xAdvance = letter.w;
        letter.offsetY = letterTexture._offsetY;
        letter.originW = width;//letterTexture._width;
        letter.originH = height;//letterTexture._height;
        letter.hash = letterTexture._hash;
        letter.refCount = 0;

        this._x += width + space;

        //尺寸同步
        if (isLFontFlag) {
            this._lx = this._x;
            this._ly = this._y;
            this._lnexty = this._nexty;
        } else {
            this._bx = this._x;
            this._by = this._y;
            this._bnexty = this._nexty;
        }

        this._fontDefDictionary.addLetterDefinitions(letterTexture._hash, letter);

        return letter
    },

    update() {
        if (!this._dirty) return;
        this._fontDefDictionary._texture.update();
        this._dirty = false;
    },

    reset() {
        this._x = space;
        this._y = space;
        this._nexty = space;
        //44x44 作为字体大小
        this._lFontSize = 46;
        this._lx = space;
        this._ly = space;
        this._lnexty = space;
        this._lHeight = 1656; // 小字尺寸区域
        //以64x64 作为字体大小
        this._bFontSize = 72;
        this._bx = 0;
        this._by = 1656;//算出来的。 以44 为边长，36行字高度 = 44x36;
        this._bnexty = 0;
        let chars = this._fontDefDictionary._letterDefinitions;
        for (let i = 0, l = chars.length; i < l; i++) {
            let char = chars[i];
            if (!char.isValid) {
                continue;
            }
            char.destroy();
        }
        _unsedLetterList = {};
        _unsedLetterCalMap = {}
        _unsedLetterCount = 0;


        this._fontDefDictionary.clear();
    },

    destroy() {
        this.reset();
        this._fontDefDictionary._texture.destroy();
        this._fontDefDictionary._texture = null;
    },

    beforeSceneLoad() {
        this.clearAllCache();
    },

    clearAllCache() {
        this.destroy();

        let texture = new RenderTexture();
        texture.initWithSize(this._width, this._height);
        texture.update();

        this._fontDefDictionary._texture = texture;
    },

    getLetter(key) {
        return this._fontDefDictionary._letterDefinitions[key];
    },

    getTexture() {
        return this._fontDefDictionary.getTexture();
    },

    canInsetLabel(labelInfo, char, force) {
        let sizeArr = LetterTexture.calcTextSize(labelInfo, char);
        let width = sizeArr[0], height = sizeArr[1];
        let nexty = this._nexty;
        let thisY = this._y;
        if ((this._x + width + space) > this._width) {
            thisY = this._nexty;
        }
        if ((thisY + height) > nexty) {
            nexty = thisY + height + space;
        }
        let maxY = force ? this._height : this._safeHeight;
        if (nexty > maxY) {
            return false;
        }
        return true;
    },
    findUnsedLetterFor(letterInfo) {
        if (_unsedLetterCount <= 0) return null;
        let width = letterInfo._texture.width, height = letterInfo._texture.height;
        let lSzie = letterInfo._labelInfo.fontAtlas._lFontSize;
        let bSize = letterInfo._labelInfo.fontAtlas._bFontSize;
        if (width > lSzie || height > lSzie) {
            width = bSize;
            height = bSize;
        } else {
            width = lSzie;
            height = lSzie;
        }
        let calFindLetter = (list, calHW) => {
            if (!list || list.length <= 0) return null;
            let letter = null;
            do {
                let _letter = list[0];
                if (!_letter) break;
                if (_letter.refCount <= 0 && _letter.valid) {
                    letter = _letter;
                    _unsedLetterCalMap[calHW].splice(0, 1);
                    delete _unsedLetterList[letter.hash];
                    _unsedLetterCount--;
                    break;
                } else {
                    _unsedLetterCalMap[calHW].splice(0, 1);
                }
            } while (true)
            return letter;
        }
        let calHW = this.getCalHW(width, height);
        if (_unsedLetterCalMap[calHW] && _unsedLetterCalMap[calHW].length > 0) {
            return calFindLetter(_unsedLetterCalMap[calHW], calHW);
        } else {
            for (let key in _unsedLetterCalMap) {
                if (_unsedLetterCalMap[key].length > 0) {
                    let _w = (key / 1000000).toFixed(2), _h = (key % 10000) / 100;
                    if (_w >= width && _h >= height) {
                        return calFindLetter(_unsedLetterCalMap[key], key);
                    }
                }
            }
        }
        return null;
    },
    replaceLetterTexture(oldLetter, letterTexture) {
        let texture = letterTexture._texture;
        let oldHash = oldLetter.hash;
        this._fontDefDictionary._texture.drawTextureAt(texture, oldLetter.u - bleed / 2, oldLetter.v - bleed / 2);
        oldLetter.hash = letterTexture._hash;
        oldLetter.w = letterTexture._width - bleed;
        oldLetter.h = letterTexture._height - bleed;
        oldLetter.xAdvance = oldLetter.w;
        oldLetter.offsetY = letterTexture._offsetY;
        oldLetter.refCount = 0;
        oldLetter.valid = true;
        this._dirty = true;
        this._fontDefDictionary.addLetterDefinitions(letterTexture._hash, oldLetter);
        this._fontDefDictionary._letterDefinitions[oldHash] = null;
        delete this._fontDefDictionary._letterDefinitions[oldHash];
        //this.showLetterTexture();
        return oldLetter;
    },
    showLetterTexture: function () {
        if (!_debugNode) {
            var width = 1334;
            var height = 750;
            _debugNode = new cc.Node("DYNAMIC_ATLAS_DEBUG_NODE");
            _debugNode.width = width;
            _debugNode.height = height;
            _debugNode.x = width / 2;
            _debugNode.y = height / 2;
            _debugNode.zIndex = cc.macro.MAX_ZINDEX;
            _debugNode.parent = cc.director.getScene();
            var spriteFrame = new cc.SpriteFrame();
            spriteFrame.setTexture(this._fontDefDictionary._texture);
            var sprite = _debugNode.addComponent(cc.Sprite);
            sprite.spriteFrame = spriteFrame;
        } else {
            if (!_debugNode.isValid || _debugNode.parent.name != cc.director.getScene().name) {
                //_debugNode.destroy();
                _debugNode = null;
                return;
            }
            var sp = _debugNode.getComponent(cc.Sprite);
            var spr = new cc.SpriteFrame();
            spr.setTexture(this._fontDefDictionary._texture);
            sp.spriteFrame = spr;
        }

    },
    decRefByFontDefDictionaryHash(hash) {
        let letter = this.getLetter(hash);
        if (!letter) return;
        if (letter.refCount < 0) return console.error("================ error refCount :", hash, "================");
        letter.refCount--;
        if (letter.refCount == 0) {
            _unsedLetterList[hash] = letter;
            _unsedLetterCount++;
            let calHW = this.getCalHW(letter.originW, letter.originH);
            if (!_unsedLetterCalMap[calHW]) {
                _unsedLetterCalMap[calHW] = [];
            }
            _unsedLetterCalMap[calHW].push(letter);
        }
    },
    getCalHW: function (width, height) {
        return Math.floor(width.toFixed(2) * 1000000 + height.toFixed(2) * 100);
    },
    getLetterDefinitionForChar: function (char, labelInfo) {
        let hash = char.charCodeAt(0) + labelInfo.hash;
        let letter = this._fontDefDictionary._letterDefinitions[hash];
        if (letter && _unsedLetterList[hash]) {
            delete _unsedLetterList[hash];
            _unsedLetterCount--;
            let calHW = this.getCalHW(letter.originW, letter.originH);
            let _uMapList = _unsedLetterCalMap[calHW];
            for (let i = 0, l = _uMapList.length; i < l; i++) {
                if (_uMapList[i].hash == letter.hash) {
                    _unsedLetterCalMap[calHW].splice(i, 1);
                    break
                }
            }
        }
        if (!letter) {
            let temp = new LetterTexture(char, labelInfo);
            temp.updateRenderData();
            letter = this.insertLetterTexture(temp);

            if (!letter) {
                let oldLetter = null;
                if (_unsedLetterCount > 0) {
                    oldLetter = this.findUnsedLetterFor(temp);
                }
                if (oldLetter) {
                    letter = this.replaceLetterTexture(oldLetter, temp);
                    // console.log('替换');
                }
            }

            if (!letter) {
                console.log('none');
            }

            temp.destroy();
        }



        return letter;
    }
});

function computeHash(labelInfo) {
    let hashData = '';
    let color = labelInfo.color.toHEX();
    let out = '';
    if (labelInfo.isOutlined && labelInfo.margin > 0) {
        out = out + labelInfo.margin + labelInfo.out.toHEX();
    }

    return hashData + labelInfo.fontSize + labelInfo.fontFamily + color + out;
}

let _shareAtlas = null;

let _atlasWidth = 2048;
let _atlasHeight = 2048;
let _isBold = false;

export default class LetterFontAssembler extends WebglBmfontAssembler {
    _getAssemblerData() {
        if (!_shareAtlas) {
            _shareAtlas = new LetterAtlas(_atlasWidth, _atlasHeight);
            cc.Label._shareAtlas = _shareAtlas;
        }

        return _shareAtlas.getTexture();
    }

    _updateFontFamily(comp) {
        shareLabelInfo.fontAtlas = _shareAtlas;
        shareLabelInfo.fontFamily = getFontFamily(comp);

        // outline
        let outline = OUTLINE_SUPPORTED && comp.getComponent(LabelOutline);
        if (outline && outline.enabled) {
            shareLabelInfo.isOutlined = true;
            shareLabelInfo.margin = outline.width;
            shareLabelInfo.out = outline.color.clone();
            shareLabelInfo.out.a = outline.color.a;// * comp.node.color.a / 255.0;
        }
        else {
            shareLabelInfo.isOutlined = false;
            shareLabelInfo.margin = 0;
        }
    }

    _updateLabelInfo(comp) {
        shareLabelInfo.fontDesc = this._getFontDesc();
        shareLabelInfo.color = comp.node.color;
        shareLabelInfo.hash = computeHash(shareLabelInfo);
    }

    _getFontDesc() {
        let fontDesc = shareLabelInfo.fontSize.toString() + 'px ';
        fontDesc = fontDesc + shareLabelInfo.fontFamily;
        if (_isBold) {
            fontDesc = "bold " + fontDesc;
        }

        return fontDesc;
    }
    _computeHorizontalKerningForText() {
        this._clearHorizontalKerning();
    }
    _determineRect(tempRect) {
        return false;
    }
    _getShareLabelInfoFontAtlas() {
        return shareLabelInfo.fontAtlas;
    }
}