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

$.ajax({ 
    url: 'https://api.imgur.com/3/gallery.json',
    headers: {
        'Authorization': 'Client-ID 699913a195a439d'
    },
    type: 'GET',
    success: function(data) { 
    	console.log(data.data.length);
    	console.log(data.data[0].link); 
    var Imgur = function() {
	    this.items = [];
	    this.page=0;
	    };
    
   Imgur.Page = function() {
	   var url
	   
	   
   }
   
   
    }
});