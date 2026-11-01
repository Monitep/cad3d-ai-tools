package expert.cad3d.bitlab;

import android.app.Activity;
import android.os.Bundle;
import android.graphics.Color;
import android.graphics.Typeface;
import android.graphics.drawable.GradientDrawable;
import android.view.Gravity;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;

public class MainActivity extends Activity {
    private final int bg=Color.rgb(13,20,43), ink=Color.WHITE, muted=Color.rgb(183,196,224), blue=Color.rgb(112,137,255), mint=Color.rgb(138,235,202);
    private LinearLayout root;
    private String screen="home", digits="", first="", op="+", mode="binary", result="";
    private int step=0;
    private int dp(float x){return (int)(x*getResources().getDisplayMetrics().density+.5f);}
    @Override public void onCreate(Bundle b){super.onCreate(b);getWindow().setStatusBarColor(bg);getWindow().setNavigationBarColor(bg);getWindow().setSoftInputMode(WindowManager.LayoutParams.SOFT_INPUT_STATE_ALWAYS_HIDDEN);if(b!=null){screen=b.getString("screen","home");digits=b.getString("digits","");first=b.getString("first","");op=b.getString("op","+");mode=b.getString("mode","binary");result=b.getString("result","");step=b.getInt("step");}show();}
    @Override public void onSaveInstanceState(Bundle b){super.onSaveInstanceState(b);b.putString("screen",screen);b.putString("digits",digits);b.putString("first",first);b.putString("op",op);b.putString("mode",mode);b.putString("result",result);b.putInt("step",step);}
    private GradientDrawable shape(int color, int radius){GradientDrawable d=new GradientDrawable();d.setColor(color);d.setCornerRadius(dp(radius));return d;}
    private void start(){ScrollView s=new ScrollView(this);s.setFillViewport(true);s.setBackgroundColor(bg);root=new LinearLayout(this);root.setOrientation(LinearLayout.VERTICAL);root.setGravity(Gravity.CENTER_HORIZONTAL);root.setPadding(dp(27),dp(35),dp(27),dp(36));s.addView(root);setContentView(s);}
    private TextView text(String str,int sp,int color,boolean bold){TextView t=new TextView(this);t.setText(str);t.setTextSize(sp);t.setTextColor(color);t.setGravity(Gravity.CENTER);t.setLineSpacing(dp(2),1f);if(bold)t.setTypeface(Typeface.DEFAULT,Typeface.BOLD);LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,-2);p.bottomMargin=dp(8);root.addView(t,p);return t;}
    private Button button(String label,int color,Runnable action){Button b=new Button(this);b.setText(label);b.setTextSize(15);b.setTextColor(ink);b.setAllCaps(false);b.setMinHeight(dp(48));b.setBackground(shape(color,24));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(-1,dp(50));p.bottomMargin=dp(8);root.addView(b,p);b.setOnClickListener(v->action.run());return b;}
    private void row(String[] labels,Runnable[] acts){LinearLayout r=new LinearLayout(this);r.setGravity(Gravity.CENTER);LinearLayout.LayoutParams rp=new LinearLayout.LayoutParams(-1,dp(52));rp.bottomMargin=dp(8);root.addView(r,rp);for(int i=0;i<labels.length;i++){final Runnable a=acts[i];Button b=new Button(this);b.setText(labels[i]);b.setTextSize(17);b.setAllCaps(false);b.setTextColor(ink);b.setMinWidth(0);b.setMinimumWidth(0);b.setPadding(0,0,0,0);b.setBackground(shape(Color.rgb(47,61,105),24));LinearLayout.LayoutParams p=new LinearLayout.LayoutParams(0,dp(48),1);p.setMargins(dp(3),0,dp(3),0);r.addView(b,p);b.setOnClickListener(v->a.run());}}
    private void go(String s){screen=s;show();}
    private void add(String d){if(digits.length()<(mode.equals("binary")?16:5)){digits+=d;show();}}
    private void clear(){if(!digits.isEmpty())digits=digits.substring(0,digits.length()-1);show();}
    private void show(){start();switch(screen){case "home":home();break;case "choose":choose();break;case "input":input();break;case "ops":ops();break;case "result":result();break;case "guide":guide();break;default:screen="home";home();}}
    private void home(){text("BIT LAB",14,mint,true);text("Il binario\nal polso",24,ink,true);text("Scegli cosa vuoi fare",13,muted,false);button("Converti",Color.rgb(69,87,190),()->go("choose"));button("Calcola",Color.rgb(47,61,105),()->go("ops"));button("Promemoria",Color.rgb(47,61,105),()->go("guide"));}
    private void choose(){text("Converti",21,ink,true);text("Da quale base parti?",13,muted,false);button("Binario → decimale",Color.rgb(69,87,190),()->{mode="binary";step=0;digits="";go("input");});button("Decimale → binario",Color.rgb(47,61,105),()->{mode="decimal";step=0;digits="";go("input");});button("‹ Indietro",Color.rgb(38,49,83),()->go("home"));}
    private void ops(){text("Calcola",21,ink,true);text("Scegli l’operazione",13,muted,false);row(new String[]{"+", "−"},new Runnable[]{()->begin("+"),()->begin("−")});row(new String[]{"×", "÷"},new Runnable[]{()->begin("×"),()->begin("÷")});button("‹ Indietro",Color.rgb(38,49,83),()->go("home"));}
    private void begin(String o){op=o;mode="binary";step=1;digits="";first="";go("input");}
    private void input(){text(step==0?(mode.equals("binary")?"Binario":"Decimale"):(step==1?"Primo numero":"Secondo numero"),18,ink,true);text(step==0?"Inserisci le cifre":("Operazione "+op+" · base 2"),12,muted,false);text(digits.isEmpty()?"—":digits, digits.length()>10?14:21, digits.isEmpty()?muted:mint,true);if(mode.equals("binary")){row(new String[]{"0","1"},new Runnable[]{()->add("0"),()->add("1")});}else{row(new String[]{"1","2","3"},new Runnable[]{()->add("1"),()->add("2"),()->add("3")});row(new String[]{"4","5","6"},new Runnable[]{()->add("4"),()->add("5"),()->add("6")});row(new String[]{"7","8","9"},new Runnable[]{()->add("7"),()->add("8"),()->add("9")});row(new String[]{"0","⌫"},new Runnable[]{()->add("0"),this::clear});}if(mode.equals("binary"))button("⌫ Cancella cifra",Color.rgb(47,61,105),this::clear);button(step==1?"Avanti":"Risultato",Color.rgb(69,87,190),this::submit);button("‹ Indietro",Color.rgb(38,49,83),this::back);}
    private void submit(){try{int n=MathCore.parse(digits,mode.equals("binary")?2:10);if(step==0){result=mode.equals("binary")?digits+"₂\n= "+n+"₁₀":n+"₁₀\n= "+MathCore.binary(n)+"₂";}else if(step==1){first=digits;digits="";step=2;show();return;}else{int a=MathCore.parse(first,2);String calculated=MathCore.calculate(a,n,op);result=first+" "+op+" "+digits+"\n= "+calculated+"₂";}go("result");}catch(IllegalArgumentException e){text(e.getMessage(),13,Color.rgb(255,165,179),true);}}
    private void result(){text("Risultato",16,muted,true);TextView t=text(result,19,mint,true);t.setTextIsSelectable(true);button("Nuovo calcolo",Color.rgb(69,87,190),()->{digits="";if(step==0)go("choose");else go("ops");});button("Modifica numero",Color.rgb(47,61,105),()->go("input"));button("Menu",Color.rgb(38,49,83),()->go("home"));}
    private void guide(){text("Promemoria",20,ink,true);text("Potenze di 2",15,mint,true);text("1 · 2 · 4 · 8\n16 · 32 · 64\n128 · 256",17,ink,false);text("Somma",15,mint,true);text("1 + 1 = 10\nScrivi 0 e riporti 1.",14,ink,false);text("Sottrazione",15,mint,true);text("10 − 1 = 1\nPrendi in prestito dalla colonna a sinistra.",14,ink,false);text("Conversione",15,mint,true);text("Da binario: somma i valori dei bit accesi.\n\nDa decimale: dividi per 2 e leggi i resti dal basso.",14,ink,false);button("‹ Menu",Color.rgb(47,61,105),()->go("home"));}
    private void back(){if(screen.equals("home")){finish();return;}if(screen.equals("input")){if(step==2){digits=first;step=1;show();}else if(step==1)go("ops");else go("choose");}else if(screen.equals("result"))go("input");else go("home");}
    @Override public void onBackPressed(){back();}
}
