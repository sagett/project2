

var imageArray = [];

//https://api.imgur.com/3/gallery.json 

$.ajax({ 
    url: 'https://api.imgur.com/3/gallery/user/time/:page.json',
    headers: {
        'Authorization': 'Client-ID 699913a195a439d'
    },
    type: 'GET',
    success: function(data) { 
    	console.log(data);
    	console.log(data.data[0].link);
    		
    for (var i=0; i< data.data.length; i++){
	   if (data.data[i].type == "image/gif") {
	    	var currentImg = data.data[i];
	    	var URL = currentImg.link;
	    	imageArray.push(URL); 
	    	console.log(URL);
	    } 
function displayImg(URL){
	var html = '<img  id = "a' + [i] + '" src="'+ URL + '" alt = "current img" >'
	$(".imgur").prepend(html);
		}
		displayImg(URL);
	
   }
 }
   
   
});


$('.container').jscroll();
	
	
	function storeGif(URL){


    // make the array a string
    imageArray = JSON.stringify(URL);
    console.log('json: ' + URL);

    // store the string
    localStorage.imageArray = imageArray;

}

//$('#feed').on('click','article',function(){


