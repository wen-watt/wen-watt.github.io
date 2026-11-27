from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance
import json
U='/mnt/user-data/uploads/'
SRC={'world':U+'f95bd323-image.webp','north':U+'59b5b0cd-image.webp','triple':U+'6651d759-image.webp','brazil':U+'4ef2713b-image.webp','ecuador':U+'55b15c42-image.webp','peru':U+'ad2df101-image.webp'}
SER='/usr/share/fonts/truetype/liberation/LiberationSerif-Bold.ttf'; I='/usr/share/fonts/opentype/inter/'
F=lambda p,s: ImageFont.truetype(p,s)
TEAL=(79,209,197); GOLD=(240,190,90); BG=(11,14,24)
C=[(6,251),(266,517),(532,777)]
RW=[(6,365),(455,812),(902,1262)]
RN=[(6,365),(455,812),(901,1260)]
def tile(src,r,c,rows): x0,x1=C[c]; y0,y1=rows[r]; return (src,(x0,y0,x1,y1))
T={0:(0,375),1:(449,822),2:(893,1268)}
ITEMS=[
 ('new-york','New York','USA','Times Square',tile('world',0,0,RW)),
 ('paris','Paris','France','Seine River',tile('world',0,1,RW)),
 ('tokyo','Tokyo','Japan','Shibuya Crossing',tile('world',0,2,RW)),
 ('london','London','United Kingdom','Big Ben',tile('world',1,0,RW)),
 ('rome','Rome','Italy','Colosseum',tile('world',1,1,RW)),
 ('cairo','Cairo','Egypt','Pyramids of Giza',tile('world',1,2,RW)),
 ('sydney','Sydney','Australia','Opera House',tile('world',2,0,RW)),
 ('rio-de-janeiro','Rio de Janeiro','Brazil','Christ the Redeemer',tile('world',2,1,RW)),
 ('new-delhi','New Delhi','India','India Gate',tile('world',2,2,RW)),
 ('toronto','Toronto','Canada','CN Tower',tile('north',0,0,RN)),
 ('reykjavik','Reykjavik','Iceland','Hallgrímskirkja',tile('north',0,1,RN)),
 ('stockholm','Stockholm','Sweden','Old Town',tile('north',1,0,RN)),
 ('helsinki','Helsinki','Finland','Helsinki Cathedral',tile('north',1,1,RN)),
 ('amsterdam','Amsterdam','Netherlands','Canals',tile('north',2,0,RN)),
 ('berlin','Berlin','Germany','Brandenburg Gate',tile('north',2,1,RN)),
 ('zermatt','Zermatt','Switzerland','Matterhorn',tile('north',2,2,RN)),
 ('ouro-preto','Ouro Preto','Brazil','Colonial town',('brazil',(0,0,784,1100))),
 ('galapagos','Galápagos','Ecuador','Galápagos Islands',('ecuador',(0,0,784,1100))),
 ('machu-picchu','Machu Picchu','Peru','Inca citadel',('peru',(0,125,832,1060))),
]
W,H=1000,1500
def poster(slug,city,country,place,spec,out):
    im=Image.open(SRC[spec[0]]).convert('RGB').crop(spec[1])
    bg=im.resize((W,int(W*im.height/im.width)) if im.width/im.height>W/H else (int(H*im.width/im.height),H),Image.LANCZOS)
    bg=bg.crop(((bg.width-W)//2,(bg.height-H)//2,(bg.width-W)//2+W,(bg.height-H)//2+H)).filter(ImageFilter.GaussianBlur(28))
    bg=ImageEnhance.Brightness(bg).enhance(0.42)
    P=bg.copy(); g=Image.new('L',(1,H))
    for j in range(H): g.putpixel((0,j),int(min(1,max(0,(j-H*0.55)/(H*0.3)))*235))
    P=Image.composite(Image.new('RGB',(W,H),BG),P,g.resize((W,H)))
    bw,bh=860,1000
    s=min(bw/im.width,bh/im.height); cw,ch=int(im.width*s),int(im.height*s)
    card=im.resize((cw,ch),Image.LANCZOS).filter(ImageFilter.UnsharpMask(2,70,2))
    x=(W-cw)//2; y=90+(bh-ch)//2 if ch<bh else 90
    sh=Image.new('RGBA',(W,H),(0,0,0,0)); ImageDraw.Draw(sh).rounded_rectangle((x+6,y+14,x+cw+6,y+ch+14),26,fill=(0,0,0,170)); sh=sh.filter(ImageFilter.GaussianBlur(16)); P.paste(sh,(0,0),sh)
    m=Image.new('L',(cw,ch),0); ImageDraw.Draw(m).rounded_rectangle((0,0,cw-1,ch-1),24,fill=255); P.paste(card,(x,y),m)
    d=ImageDraw.Draw(P)
    def ctr(yy,txt,font,fill,track=0):
        w=sum(d.textlength(c,font=font) for c in txt)+track*(len(txt)-1); xx=(W-w)/2
        for c in txt: d.text((xx,yy),c,font=font,fill=fill); xx+=d.textlength(c,font=font)+track
    ty=max(y+ch+50,1150)
    ctr(ty,'WANDERING WEN',F(I+'Inter-Bold.otf',30),TEAL,9)
    ft=F(SER,96 if len(city)<11 else 80); ctr(ty+46,city,ft,(255,255,255))
    ctr(ty+160,f'{country}  ·  {place}',F(I+'Inter-Regular.otf',34),(205,212,228))
    ctr(H-62,'wen-watt.github.io',F(I+'Inter-SemiBold.otf',26),GOLD)
    P.save(out,quality=88,optimize=True,progressive=True)
import os; os.makedirs('out',exist_ok=True)
for it in ITEMS: poster(*it,f'out/wandering-wen-{it[0]}.jpg')
json.dump([dict(slug=a,city=b,country=c,place=d) for a,b,c,d,_ in ITEMS],open('items.json','w'),ensure_ascii=False,indent=1)
# contact sheet
ims=[Image.open(f'out/wandering-wen-{it[0]}.jpg').resize((200,300)) for it in ITEMS]
cs=Image.new('RGB',(200*7,300*3),(255,255,255))
for i,x in enumerate(ims): cs.paste(x,((i%7)*200,(i//7)*300))
cs.save('sheet.jpg',quality=82)
