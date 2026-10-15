"""Colored native-pixel campus plates, preserving the approved acting coordinates."""
from pathlib import Path
import math
from PIL import Image, ImageDraw

ROOT=Path(__file__).resolve().parent
DEST=ROOT;DEST.mkdir(exist_ok=True)
C={
 'sky':'#a5bfd1','skyLight':'#c8d8df','cloud':'#e4e7dc','cloudS':'#b3c6cc',
 'ink':'#344e5c','roof':'#9a6860','roofHi':'#bd8670','cream':'#d4c5a4','wall':'#c1b69d','brick':'#a9826f',
 'glass':'#5d8d9e','glassLight':'#9bc5cc','glassS':'#426a7c','white':'#e7e4d3','metal':'#637e85',
 'grass':'#769c7d','grassHi':'#99b18a','grassS':'#527b6a','leaf':'#719e74','leafHi':'#a5bd85','leafS':'#406e61',
 'trunk':'#7b6456','bark':'#b58a6c','track':'#ad7e6b','trackHi':'#c49177','trackS':'#8b6a65',
 'wood':'#ba8c58','woodHi':'#d9b477','woodS':'#89664c','yellow':'#e7cb79','rose':'#ce968c','teal':'#4e9290',
 'blue':'#678eae','navy':'#3e637f','slate':'#6a8393','paper':'#e4d8b6','gold':'#dcbf85','wet':'#6a8e9d'
}
im=None;d=None;pal=None
def rgb(col):return pal.get(col,col)
def rect(x,y,w,h,col):
    if w>0 and h>0:d.rectangle((round(x),round(y),round(x)+max(1,round(w))-1,round(y)+max(1,round(h))-1),fill=rgb(col))
def line(ps,col,w=1):d.line([(round(x),round(y)) for x,y in ps],fill=rgb(col),width=w)
def poly(ps,col):d.polygon([(round(x),round(y)) for x,y in ps],fill=rgb(col))
def ell(x,y,w,h,col):d.ellipse((round(x),round(y),round(x+w-1),round(y+h-1)),fill=rgb(col))
def begin(changes=None):
    global im,d,pal
    pal=C| (changes or {});im=Image.new('RGB',(320,180),pal['sky']);d=ImageDraw.Draw(im)
def sky(ymax=100):
    b=[0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5]
    for y in range(ymax):
        for x in range(320):
            col='skyLight' if (b[(y%4)*4+x%4]+.5)/16<y/ymax else 'sky'
            im.putpixel((x,y),tuple(bytes.fromhex(pal[col][1:])))
def cloud(x,y,w=37):
    rect(x,y+5,w,5,'cloudS');rect(x+3,y+1,w-7,7,'cloud');rect(x+11,y-4,w-23,8,'cloud');rect(x+6,y+8,w-16,2,'cloudS')
def tree(x,y,s=1):
    rect(x-2*s,y-35*s,4*s,35*s,'trunk');rect(x,y-34*s,s,32*s,'bark')
    for a,b,w,h in [(-15,-52,28,22),(-22,-42,24,20),(-4,-56,27,27),(6,-40,18,19)]:
        ell(x+a*s,y+b*s,w*s,h*s,'leafS');ell(x+(a+1)*s,y+(b-3)*s,(w-2)*s,(h-3)*s,'leaf')
    for j in range(12):
        xx=x+(-15+(j*17)%31)*s;yy=y+(-47+(j*13)%20)*s;rect(xx,yy,3*s,s,'leafHi')
    line([(x,y-18*s),(x-9*s,y-34*s)],'trunk',max(1,round(2*s)))
def shrubs(x,y,w):
    rect(x,y,w,5,'grassS')
    for j in range(max(3,w//3)):
        xx=x+j*3;rect(xx,y-1-(j%3),2,3,'leaf');
        if j%3==0:rect(xx,y-3-j%2,2,2,'rose' if j%2 else 'yellow')
def school(x,y,w,h,night=False):
    rect(x-1,y-2,w+2,h+3,'ink');rect(x,y,w,h,'cream');rect(x,y+h-8,w,8,'brick');rect(x,y+2,w,2,'wall')
    poly([(x-5,y-2),(x+w//2,y-12),(x+w+5,y-2)],'roof');line([(x-3,y-3),(x+w//2,y-11),(x+w+3,y-3)],'roofHi')
    for yy in [y+8,y+24]:
        for xx in range(x+7,x+w-7,15):
            rect(xx,yy,9,10,'ink');rect(xx+1,yy+1,7,7,'gold' if night else 'glass');rect(xx+1,yy+1,2,5,'yellow' if night else 'glassLight');rect(xx+4,yy,1,10,'cream')
    rect(x+w//2-6,y+h-13,13,13,'ink');rect(x+w//2-4,y+h-12,9,12,'glassS');rect(x+w//2,y+h-12,1,12,'woodHi')
    for yy in range(y+h-7,y+h,4):
        for xx in range(x+2,x+w-2,9):rect(xx,yy,6,1,'roofHi')
    rect(x-3,y+h,w+6,2,'white')
def fence(y,x0=0,x1=320):
    for x in range(x0,x1,10):rect(x,y-16,1,16,'metal');rect(x,y-17,1,1,'white')
    rect(x0,y-12,x1-x0,1,'metal');rect(x0,y-3,x1-x0,1,'metal')
def lamp(x,y,lit=False):
    rect(x,y-44,2,44,'ink');rect(x-3,y-50,8,7,'ink');rect(x-2,y-49,6,5,'gold' if lit else 'glassLight');rect(x-4,y-51,10,1,'metal')
    if lit:rect(x-2,y-48,6,2,'yellow')
def playground(state):
    changes={}
    if state=='clear':changes={'sky':'#88b3cc','skyLight':'#c4dce0','cloud':'#f0ebd5','grass':'#7fa77e','grassHi':'#a4bc8d','track':'#b98570','trackHi':'#ce9b7b'}
    if state=='dusk':changes={'sky':'#8f9bac','skyLight':'#d9b8a0','cloud':'#e7ccb0','cloudS':'#ada5ae','grass':'#6e8a77','grassHi':'#94a485','leaf':'#7b986d','leafHi':'#c1b47f','track':'#ae806b','trackHi':'#c49776','cream':'#d0b695','wall':'#b59f8b','glass':'#bca477','glassLight':'#dec398'}
    begin(changes);sky(100);cloud(18,20,53);cloud(126,9,45);cloud(258,17,48)
    # Layered campus skyline, school and side library.
    poly([(0,76),(18,67),(36,72),(54,59),(75,74),(107,67),(141,75),(176,68),(211,79),(320,76),(320,100),(0,100)],'grassS')
    school(207,43,104,43,state=='dusk');school(12,63,49,25,state=='dusk')
    rect(0,87,320,16,'grass');fence(89)
    tree(83,99,.75);tree(176,94,.58);tree(308,104,.65)
    shrubs(0,96,62);shrubs(230,99,90)
    rect(0,103,320,77,'track');rect(0,104,320,1,'trackHi')
    # Brick-red lanes surround the green infield; actors remain on a clear lane at y145.
    poly([(24,103),(294,103),(270,121),(45,121)],'grass');line([(24,103),(294,103),(270,121),(45,121),(24,103)],'grassHi')
    for y in [124,135,149,166]:
        d.arc((-61,y-37,384,y+125),192,348,fill=rgb('white'),width=1)
        line([(19,y),(301,y-3)],'white')
    for j in range(20):
        xx=(j*41)%320;yy=110+(j*13)%67;rect(xx,yy,1,1,'trackHi')
    # Goal, basketball board, flagpole, campus signage and flowers stay outside the acting corridor.
    rect(14,72,40,2,'white');rect(14,72,2,22,'white');rect(52,72,2,22,'white')
    for x in range(19,51,5):rect(x,75,1,17,'metal')
    for yy in [78,84,90]:rect(16,yy,36,1,'metal')
    rect(288,72,2,28,'metal');rect(279,64,19,11,'white');rect(283,67,10,5,'roof');rect(283,73,10,1,'ink')
    rect(18,39,1,29,'metal');rect(17,38,3,1,'white')
    for x in [65,99,133,166]:rect(x,96,2,2,'yellow')
    shrubs(0,157,38);shrubs(292,153,28)
    if state=='dusk':
        for yy in [137,140,143]:rect(88,yy,129,3,'woodS');rect(89,yy,127,1,'woodHi')
        rect(92,146,3,7,'ink');rect(209,146,3,7,'ink');lamp(46,118,True);lamp(278,117,True)
    im.save(DEST/('playground-'+('gray' if state=='overcast' else state)+'.png'))

def gate():
    begin({'sky':'#365771','skyLight':'#6c91a5','cloud':'#7b9dab','cloudS':'#4b6c80','cream':'#87958d','wall':'#738b8b','roof':'#685f68','roofHi':'#a2887a','grass':'#496e63','leaf':'#4d796b','leafHi':'#74977b','leafS':'#2f5860','track':'#546d7c'})
    sky(112);cloud(18,13,61);school(76,52,87,45,True);school(177,44,99,53,True)
    tree(27,111,.85);tree(302,111,.9);rect(0,101,320,79,'track')
    poly([(137,100),(178,100),(256,180),(53,180)],'wet');line([(136,102),(57,179)],'glassLight');line([(179,102),(253,179)],'glassS')
    rect(0,110,320,5,'brick');rect(0,110,320,1,'wall');fence(111,0,120);fence(111,187,320)
    for x in [120,180]:rect(x,66,7,48,'cream');rect(x-2,64,11,3,'wall');rect(x+2,68,2,43,'brick')
    rect(110,60,82,8,'navy');rect(111,61,80,1,'glassLight')
    # Small guardhouse and covered noticeboard provide a lived-in school entrance.
    rect(4,102,32,20,'brick');poly([(0,102),(37,102),(32,97),(5,97)],'roof');rect(8,106,24,10,'ink');rect(9,107,22,8,'gold');rect(19,107,2,8,'woodS')
    rect(273,105,33,17,'ink');rect(275,107,29,12,'cream');rect(278,109,9,7,'blue');rect(289,109,11,7,'rose');rect(275,122,2,9,'ink');rect(303,122,2,9,'ink')
    shrubs(198,118,62);lamp(43,139,True)
    poly([(37,139),(48,139),(74,153),(12,153)],'slate');rect(23,148,35,1,'gold');rect(31,151,21,1,'yellow')
    for j in range(15):
        xx=82+(j*29)%230;yy=130+(j*11)%46;rect(xx,yy,9+j%3*4,1,'glass');rect(xx+2,yy+2,7,1,'navy')
        if j%4==0:rect(xx,yy,9,1,'gold')
    im.save(DEST/'gate.png')

def desk(x,y):
    poly([(x,y-6),(x+53,y-6),(x+59,y+3),(x-4,y+3)],'wood');line([(x,y-6),(x+53,y-6),(x+59,y+3)],'woodHi')
    rect(x-4,y+4,63,3,'woodS');rect(x+2,y+7,3,22,'ink');rect(x+51,y+7,3,22,'ink')
    line([(x+3,y-2),(x+44,y-2)],'woodHi');rect(x+8,y+7,37,1,'woodS')
def classroom():
    begin();rect(0,0,320,180,'cream');rect(0,83,320,28,'grassHi');rect(0,108,320,3,'woodS');rect(0,111,320,69,'trackHi')
    rect(17,23,163,66,'woodS');rect(20,26,157,60,'leafS');rect(23,29,151,54,'#355f58');rect(16,86,165,3,'wood')
    for a,b,w in [(34,38,41),(84,38,32),(37,53,65),(115,53,38),(35,69,44),(86,69,51)]:rect(a,b,w,1,'paper')
    ell(147,34,14,14,'leafS');d.arc((147,34,160,47),0,330,fill=rgb('paper'),width=1);line([(150,42),(154,38),(157,42)],'paper')
    rect(28,85,7,2,'white');rect(43,85,8,2,'woodHi');rect(156,84,10,3,'ink')
    # Classroom wall details without replacing the empty-room story with labels.
    rect(185,31,18,24,'blue');rect(186,32,16,22,'paper');rect(188,35,12,3,'rose')
    for yy in [42,46,50]:
        for xx in [189,194,199]:rect(xx,yy,2,1,'blue')
    rect(10,94,38,8,'grass');rect(12,96,10,1,'paper');rect(26,96,18,1,'paper')
    rect(211,12,94,90,'woodS');rect(214,15,88,83,'skyLight');rect(214,70,88,27,'grass');rect(214,70,88,2,'grassHi')
    for x,y in [(220,66),(284,67)]:
        rect(x,y-15,2,19,'trunk');ell(x-6,y-29,16,19,'leaf');rect(x-3,y-26,6,2,'leafHi')
    line([(227,69),(229,32),(285,32),(288,70)],'woodS',2);line([(244,33),(243,67)],'metal');line([(267,33),(268,67)],'metal');rect(241,66,30,3,'woodS')
    rect(253,14,3,84,'woodS');rect(213,52,89,3,'woodS');rect(208,12,4,91,'#b9d2c2');rect(304,12,4,91,'#b9d2c2')
    for y in range(124,180,17):line([(0,y),(320,y)],'brick')
    for j,yy in enumerate(range(111,180,17)):
        for xx in range(0 if j%2 else 21,320,52):line([(xx,yy),(xx,yy+17)],'brick')
    for x,y in [(35,124),(111,131),(203,142),(9,153),(114,167)]:desk(x,y)
    # Books, pencil case and old satchel sit outside the flower's contact area.
    rect(45,113,18,3,'blue');rect(46,114,16,1,'paper');rect(48,110,18,3,'rose');rect(49,111,16,1,'paper');rect(19,143,21,3,'teal')
    rect(156,124,9,2,'navy');rect(156,123,7,1,'blue')
    line([(247,127),(245,121),(252,118),(256,126)],'woodS',2);rect(244,125,15,20,'woodS');rect(246,127,11,15,'roof');rect(247,128,9,4,'bark');rect(247,136,9,1,'woodHi');rect(251,133,2,3,'gold')
    im.save(DEST/'classroom.png')

def corridor():
    begin();rect(0,0,320,180,'cream');poly([(0,0),(261,65),(261,106),(0,180)],'cream');poly([(261,65),(320,44),(320,180),(261,106)],'wall')
    poly([(0,0),(261,65),(320,44),(320,0)],'skyLight');poly([(0,180),(261,106),(320,125),(320,180)],'trackHi')
    poly([(0,134),(261,99),(261,106),(0,180)],'grassS')
    poly([(250,67),(273,61),(275,108),(250,111)],'woodS');poly([(252,69),(270,65),(270,106),(253,109)],'grass')
    # Blue window glass includes actual courtyard greens and a distant school roof.
    for x1,x2,top,bottom in [(4,63,20,148),(85,131,39,129),(147,184,48,117),(196,220,57,112),(230,245,65,110)]:
        ps=[(x1,top),(x2,top+(x2-x1)*.24),(x2,bottom-(x2-x1)*.2),(x1,bottom)]
        poly(ps,'woodS');inner=[(x1+3,top+4),(x2-3,top+4+(x2-x1)*.24),(x2-3,bottom-5-(x2-x1)*.2),(x1+3,bottom-5)]
        # Hard-edged clipping preserves native pixels and the perspective opening.
        layer=Image.new('RGB',(320,180),rgb('glassLight'));ld=ImageDraw.Draw(layer)
        horizon=round(top+(bottom-top)*.63);ld.rectangle((0,horizon,319,179),fill=rgb('grass'));ld.rectangle((0,horizon+3,319,horizon+5),fill=rgb('grassHi'))
        for j in range(4):
            xx=x1+5+(j*13)%max(3,x2-x1-8);yy=horizon-6-j%2*7;ld.rectangle((xx,yy,xx+1,horizon+6),fill=rgb('trunk'));ld.ellipse((xx-7,yy-16,xx+8,yy+3),fill=rgb('leaf'))
        mask=Image.new('1',(320,180));ImageDraw.Draw(mask).polygon(inner,fill=1);im.paste(layer,(0,0),mask)
        line([(x1+2,(top+bottom)//2),(x2-2,(top+bottom)//2)],'woodHi',2);line([((x1+x2)//2,top+4),((x1+x2)//2,bottom-5)],'woodHi',2)
        line([(x1,top),(x1,bottom)],'ink')
    for y in [120,137,158,178]:line([(0,y),(261,106),(320,y)],'trackS')
    for x in [-90,15,120,230,350,480]:line([(261,106),(x,180)],'brick')
    poly([(13,161),(31,154),(179,123),(170,127)],'paper');poly([(87,163),(108,156),(217,120),(205,126)],'paper')
    for x in [285,308]:rect(x,65,3,72,'woodS')
    rect(283,79,26,24,'woodS');rect(285,81,22,19,'teal');rect(287,83,8,12,'paper');rect(297,83,8,8,'rose');rect(298,93,6,5,'yellow')
    for xx,yy in [(288,85),(288,89),(299,86)]:rect(xx,yy,4,1,'blue')
    rect(294,132,18,9,'wood');rect(295,131,16,2,'woodHi');ell(290,117,10,14,'leafS');ell(299,113,9,19,'leaf');ell(307,119,7,12,'leafHi')
    im.save(DEST/'corridor.png')

def railing():
    begin();rect(0,0,320,180,'grassS')
    for j in range(70):
        x=j*43%320;y=j*17%97;rect(x,y,8+j%4*2,3,'leaf' if j%2 else 'grass')
    rect(0,94,320,86,'trackS');rect(0,69,320,10,'ink');rect(0,69,320,2,'glassLight');rect(0,77,320,1,'metal')
    for x in [23,98,173,248]:rect(x,78,5,78,'metal');rect(x,78,1,78,'glassLight')
    rect(0,154,320,26,'track');rect(15,165,77,1,'glassLight');rect(194,160,106,1,'glassLight');rect(110,156,34,1,'wet')
    im.save(DEST/'railing.png')

if __name__=='__main__':
    for state in ['overcast','clear','dusk']:playground(state)
    gate();classroom();corridor();railing()
    print('Colored native pixel plates:',len(list(DEST.glob('*.png'))))
