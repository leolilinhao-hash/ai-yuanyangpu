module.exports=async(req,res)=>{
  res.setHeader("Content-Type","application/json; charset=utf-8");
  res.setHeader("Access-Control-Allow-Origin","*");
  res.setHeader("Access-Control-Allow-Headers","content-type");
  if(req.method==="OPTIONS")return res.status(200).end();
  try{
    const token=process.env.HF_API_TOKEN;
    if(!token)return res.status(500).json({error:"Missing HF_API_TOKEN"});
    const {date,question,me,ta,context}=req.body||{};
    if(!question||!me||!ta)return res.status(400).json({error:"Bad request"});
    const model=process.env.HF_MODEL||"mistralai/Mistral-7B-Instruct-v0.3";
    const url=`https://api-inference.huggingface.co/models/${model}`;
    const prompt=`
你是“鸳鸯谱AI小管家”。只输出与用户相关的内容，禁止空话套话、禁止科普、禁止免责声明、禁止自我介绍。
输出一段极简回答（120-220字），必须包含：
- 先给一句结论（<=20字）
- 3条可执行建议（每条<=18字）
- 1句可直接复制发给TA的话（<=26字）
不要输出标题或多余格式。

日期：${date}
我：${me.nick||"我"}，八字：${me.baziYear} ${me.baziMonth} ${me.baziDay} ${me.baziHour}，星座：${me.zodiac}
TA：${ta.nick||"TA"}，八字：${ta.baziYear} ${ta.baziMonth} ${ta.baziDay} ${ta.baziHour}，星座：${ta.zodiac}
现实因素：作息=${(context&&context.sleep)||""}；压力=${(context&&context.stress)||""}；计划=${(context&&context.plan)||""}；雷点=${(context&&context.triggers)||""}；目标=${(context&&context.goals)||""}
问题：${question}

只输出最终文本：`.trim();
    const payload={inputs:prompt,parameters:{max_new_tokens:220,temperature:0.7,top_p:0.9,return_full_text:false}};
    const r=await fetch(url,{method:"POST",headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
    const data=await r.json();
    if(!r.ok)return res.status(r.status).json({error:data?.error||"HF request failed"});
    let text="";
    if(Array.isArray(data)&&data[0]?.generated_text)text=data[0].generated_text;
    else if(data?.generated_text)text=data.generated_text;
    else if(typeof data==="string")text=data;
    else text=JSON.stringify(data);
    text=String(text).trim().replace(/^```[\s\S]*?\n/,"").replace(/```$/,"").trim();
    return res.status(200).json({answer:text});
  }catch(e){return res.status(500).json({error:e?.message||"Server error"});}
};