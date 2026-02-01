// SDAPWA v1.0.0 - Sound Manager
const SoundManager={currentSound:null,volume:0.5,play(a){if(this.currentSound){this.currentSound.pause()}const b=window.CONSTANTS.NATURE_SOUNDS[a];if(!b||!b.file){this.currentSound=null;return}this.currentSound=new Audio(b.file);this.currentSound.volume=this.volume;this.currentSound.loop=!0;this.currentSound.play().catch(c=>console.error('Audio play failed:',c))},stop(){if(this.currentSound){this.currentSound.pause();this.currentSound.currentTime=0;this.currentSound=null}},setVolume(a){this.volume=Math.max(0,Math.min(1,a));if(this.currentSound){this.currentSound.volume=this.volume}},beep(){const a=new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGWi77eOPTgwNUKbk77FkHAU7k9Xyz3osBSJ2x/DekEAKE14'+
...

'z6dtlHAY6k9Tzz34sBSJ2x/DekEAKE164f+PrtlHAZ6k9T0z3osBSJvx/DekEAKE1'+
...

'64f+LtlHAZ6k9T0z34sBSJ2x/DekEAK'); a.play().catch(b=>console.log('Beep failed:',b))}};window.SoundManager=SoundManager;console.log('✓ SoundManager loaded');
