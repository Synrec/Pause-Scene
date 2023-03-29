/*:
 * @author Synrec/Kylestclr
 * @plugindesc v1.0 Pause the game when on map (When menu disabled and pause switch on)
 * @target MZ
 * 
 * @help
 * Set the pause switch in parameter.
 * Disable menu access
 * Menu scene now replaced with pause scene
 * 
 * @param Pause Switch
 * @desc Switch which enables pause scene
 * @type switch
 * @default 1
 * 
 * @param Pause Graphics
 * @desc Graphics to draw in pause scene
 * @type struct<graphic>[]
 * @default []
 * 
 * @param Pause BGM
 * @desc BGM to play during pause
 * @type struct<bgm>
 * @default {}
 * 
 */
/*~struct~bgm:
 * 
 * @param name
 * @text Name
 * @desc Choose BGM
 * @type file
 * @dir audio/bgm/
 * 
 * @param volume
 * @text Volume
 * @desc Loudness setting
 * @type number
 * @default 90
 * 
 * @param pitch
 * @text Pitch
 * @desc Tone setting
 * @type number
 * @default 100
 * 
 * @param pan
 * @text Pan
 * @desc Balance setting
 * @type number
 * @default 0
 * 
 */
/*~struct~graphic:
 * 
 * @param Image
 * @desc Image graphic used
 * @type file
 * @dir img/pictures/
 * 
 * @param Rotation
 * @desc Apply PI radians rotation every frame
 * @type number
 * @default 0
 * @min -1
 * @decimals 3
 * 
 * @param Anchor X
 * @desc Pivot setting
 * @type number
 * @default 0
 * @min -1
 * @decimals 3
 * 
 * @param Anchor Y
 * @desc Pivot setting
 * @type number
 * @default 0
 * @min -1
 * @decimals 3
 * 
 * @param Position X
 * @desc Screen Location setting
 * @type number
 * @default 0
 * 
 * @param Position Y
 * @desc Screen Location setting
 * @type number
 * @default 0
 * 
 * @param Scroll X
 * @desc Scroll image origin
 * @type number
 * @default 0
 * @min -99999
 * 
 * @param Scroll Y
 * @desc Scroll image origin
 * @type number
 * @default 0
 * @min -99999
 * 
 */

const Syn_Pause = {};
Syn_Pause.Plugin = PluginManager.parameters('Synrec_Pause');

Syn_Pause.Switch = eval(Syn_Pause.Plugin['Pause Switch']);

Syn_Pause.Graphics = [];
try{
    const gfx = JSON.parse(Syn_Pause.Plugin['Pause Graphics']).map((graphic)=>{
        try{
            graphic = JSON.parse(graphic);
            graphic['Rotation'] = eval(graphic['Rotation']);
            graphic['Position X'] = eval(graphic['Position X']);
            graphic['Position Y'] = eval(graphic['Position Y']);
            graphic['Anchor X'] = eval(graphic['Anchor X']);
            graphic['Anchor Y'] = eval(graphic['Anchor Y']);
            graphic['Scroll X'] = eval(graphic['Scroll X']);
            graphic['Scroll Y'] = eval(graphic['Scroll Y']);
            return graphic;
        }catch(e){
            console.error(`Failed to parse graphic data`);
        }
    }).filter(graphic => !!graphic);
    Syn_Pause.Graphics = gfx;
}catch(e){
    console.warn(`Failed to parse graphic configurations. Please check plugin parameters. ${e}`);
}

Syn_Pause.BGM = {name:'', volume:90, pitch:100, pan:0};
try{
    const bgm = JSON.parse(Syn_Pause.Plugin['Pause BGM']);
    bgm['volume'] = eval(bgm['volume']);
    bgm['pitch'] = eval(bgm['pitch']);
    bgm['pan'] = eval(bgm['pan']);
    Syn_Pause.BGM = bgm;
}catch(e){
    console.error(`Failed to parse pause scene BGM`);
}

Syn_Pause_ScnMap_IsMnuEnbld = Scene_Map.prototype.isMenuEnabled;
Scene_Map.prototype.isMenuEnabled = function() {
    const base = Syn_Pause_ScnMap_IsMnuEnbld.call(this);
    return base || (
        !$gameSystem.isMenuEnabled() &&
        !$gameMap.isEventRunning() &&
        $gameSwitches.value(Syn_Pause.Switch)
    )
}

Syn_Pause_ScnMap_CallMnu = Scene_Map.prototype.callMenu;
Scene_Map.prototype.callMenu = function() {
    if(
        !$gameSystem.isMenuEnabled() &&
        !$gameMap.isEventRunning() &&
        $gameSwitches.value(Syn_Pause.Switch)
    ){
        $gameTemp.clearDestination();
        SoundManager.playCancel();
        SceneManager.push(Scene_MapPause);
    }else{
        Syn_Pause_ScnMap_CallMnu.call(this);
    }
};

function Scene_MapPause(){
    this.initialize(...arguments);
}

Scene_MapPause.prototype = Object.create(Scene_Base.prototype);
Scene_MapPause.prototype.constructor = Scene_MapPause;

Scene_MapPause.prototype.start = function(){
    Scene_Base.prototype.start.call(this);
    this._mapBGM = AudioManager.saveBgm();
    AudioManager.playBgm(Syn_Pause.BGM);
}

Scene_MapPause.prototype.create = function(){
    this.createBackground();
    this.createGraphics();
}

Scene_MapPause.prototype.createBackground = function(){
    const background = new Sprite();
    background.bitmap = SceneManager.backgroundBitmap();
    this.addChild(background);
    this._background = background;
}

Scene_MapPause.prototype.createGraphics = function(){
    const graphics = Syn_Pause.Graphics;
    const scene = this;
    const gfxs = [];
    graphics.forEach((graphic_config)=>{
        const graphic = new TilingSprite();
        graphic.bitmap = ImageManager.loadPicture(graphic_config['Image']);
        const x = graphic_config['Position X'];
        const y = graphic_config['Position Y'];
        const w = graphic.bitmap.width;
        const h = graphic.bitmap.height;
        graphic.move(x,y,w,h);
        graphic._rotRad = graphic_config['Rotation'];
        graphic._scrollingX = graphic_config['Scroll X'];
        graphic._scrollingY = graphic_config['Scroll Y'];
        graphic.anchor.x = graphic_config['Anchor X'];
        graphic.anchor.y = graphic_config['Anchor Y'];
        graphic.aliasUpdt = graphic.update;
        graphic.update = function(){
            this.aliasUpdt.call(this);
            this.origin.x += this._scrollingX;
            this.origin.y += this._scrollingY;
            this.rotation += this._rotRad;
        }
        scene.addChild(graphic)
        gfxs.push(graphic);
    })
    this._scene_graphics = gfxs;
}

Scene_MapPause.prototype.update = function(){
    Scene_Base.prototype.update.call(this);
    this.updateSceneExit();
}

Scene_MapPause.prototype.updateSceneExit = function(){
    if(this.isExitTriggered()){
        SoundManager.playCancel();
        AudioManager.playBgm(this._mapBGM);
        SceneManager.pop();
    }
}

Scene_MapPause.prototype.isExitTriggered = function(){
    return Input.isTriggered("menu") || TouchInput.isCancelled();
}