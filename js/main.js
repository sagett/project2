

function updating () {
	

}




$.ajax({ 
    url: 'https://api.imgur.com/3/image',
    headers: {
        'Authorization': 'Client-ID 699913a195a439d'
    },
    type: 'POST',
    data: {
        'image': 'helloworld.jpg'
    },
    success: function() { console.log('cool'); }
});
