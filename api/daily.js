module.exports=async(req,res)=>{
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","content-type");
  if(req.method==="OPTIONS")return res.status(200).end();
  try{
    const token=process.env.HF_API_TOKEN;
    if(!token)return res.status(500).json({error:"Missing HF_API_TOKEN"});
    const {date,me,ta,context}=req.body||{};
    if(!date||!me||!ta)return res.status(400).json({error:"Bad request"});
    const model=process.env.HF_MODEL||"mistralai/Mistral-7B-Instruct-v0.3";
    const url=`https://api-inference.huggingface.co/models/${model}`;
    const prompt=`
你是“鸳鸯谱AI日历引擎”。只输出 JSON，不要多余文字，不要代码块。
根据日期 + 双方八字四柱 + 星座 + 现实因素，生成当日相处提醒，语言必须现实具体，避免空话。
返回结构：
{"date":"YYYY-MM-DD","oneLiner":"<=22字","do":["3条<=18字"],"avoid":["2条<=16字"],"real":["3条现实注意"],"task":"<=18字"}

日期：${date}
我：${me.nick||"我"}，八字：${me.baziYear} ${me.baziMonth} ${me.baziDay} ${me.baziHour}，星座：${me.zodiac}
TA：${ta.nick||"TA"}，八字：${ta.baziYear} ${ta.baziMonth} ${ta.baziDay} ${ta.baziHour}，星座：${ta.zodiac}
现实因素：作息=${(context&&context.sleep)||""}；压力=${(context&&context.stress)||""}；计划=${(context&&context.plan)||""}；雷点=${(context&&context.triggers)||""}；目标=${(context&&context.goals)||""}

只输出 JSON：`.trim();
    const payload={inputs:prompt,parameters:{max_new_tokens:260,temperature:0.6,top_p:0.9,return_full_text:false}};
    const r=await fetch(url,{method:"POST",headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok)return res.status(r.status).json({error:data?.error||"HF request failed"});
    let text="";
    if(Array.isArray(data)&&data[0]?.generated_text)text=data[0].generated_text;
    else if(data?.generated_text)text=data.generated_text;
    else if(typeof data==="string")text=data;
    else text=JSON.stringify(data);
    text=String(text).trim().replace(/^```json\s*/,"").replace(/^```\s*/,"").replace(/```$/,"").trim();
    let obj=null;
    try{obj=JSON.parse(text);}catch{const m=text.match(/\{[\s\S]*\}/);if(m){try{obj=JSON.parse(m[0]);}catch{}}}
    if(!obj||!obj.date){
      return res.status(200).json({date,oneLiner:"今天把沟通做具体",do:["先确认再回应","只聊一件事","约定沟通时间"],avoid:["别翻旧账","别冷处理过久"],real:["先吃饭再聊","把计划写下来","晚点回消息先报备"],task:"10分钟互夸各2句"});
    }
    const out={date:obj.date||date,oneLiner:String(obj.oneLiner||""),do:Array.isArray(obj.do)?obj.do.slice(0,3).map(String):[],avoid:Array.isArray(obj.avoid)?obj.avoid.slice(0,2).map(String):[],real:Array.isArray(obj.real)?obj.real.slice(0,3).map(String):[],task:String(obj.task||"")};
    return res.status(200).json(out);
  }catch(e){return res.status(500).json({error:e?.message||"Server error"});}
};