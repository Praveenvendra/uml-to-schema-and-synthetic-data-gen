export function removeDuplicatePurgeId (data) {

    let processedData = data.map((instance, index)=>{
      let purgeId = instance?.purgeId
  
      let temp = {...instance}
      // temp.purge_id = purgeId
  
      delete temp["purgeId"]
  
      return temp
    })
    // 
  
    return processedData
  } 