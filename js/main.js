/*
$.ajax({ 
    url:'https://api.imgur.com/3/gallery.json',
    headers: {
        'Authorization': 'Client-ID 699913a195a439d'
    },
    type: 'POST',
    data: {
        'Authorization': 'Client-ID 699913a195a439d'
    },
    success: function(data) { 
    console.log(data); 
    }
});
*/

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
	    if (data.data[i].animated == true) {
	    	var currentImg = data.data[i];
	    	var URL = currentImg.link;
	    	imageArray.push(URL); 
	    	console.log(URL);

}
function displayImg(URL){
	var html = '<img src=" '+ URL + ' " alt = "current img" >'
	$(".imgur").before(html);
	}
		displayImg(URL);



}

    	
    	   
   }
   
   
 });


$('.container').jscroll({


});
	

